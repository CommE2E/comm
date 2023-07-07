// TODO: Remove this when possible
#![allow(unused)]

use aws_sdk_dynamodb::{
  operation::put_item::PutItemOutput,
  types::{
    AttributeValue, Delete, DeleteRequest, KeysAndAttributes, PutRequest,
    TransactWriteItem, Update, WriteRequest,
  },
  Error as DynamoDBError,
};
use chrono::Utc;
use comm_services_lib::database::parse_string_attribute;
use std::{collections::HashMap, sync::Arc};
use tracing::{debug, error, trace};

use crate::constants::db::*;

use super::errors::{BlobDBError, Error as DBError};
use super::types::*;

#[derive(Clone)]
pub struct DatabaseClient {
  ddb: Arc<aws_sdk_dynamodb::Client>,
}

/// public interface implementation
impl DatabaseClient {
  pub fn new(aws_config: &aws_types::SdkConfig) -> Self {
    DatabaseClient {
      ddb: Arc::new(aws_sdk_dynamodb::Client::new(aws_config)),
    }
  }

  /// Gets a blob item row from the database by its blob hash
  /// Returns None if the blob item is not found
  pub async fn get_blob_item(
    &self,
    blob_hash: impl Into<String>,
  ) -> DBResult<Option<BlobItemRow>> {
    let key = PrimaryKey::for_blob_item(blob_hash);
    match self.get_raw_item(key).await? {
      Some(attributes) => {
        let blob_item = BlobItemRow::try_from(attributes)?;
        Ok(Some(blob_item))
      }
      None => Ok(None),
    }
  }

  /// Inserts a new blob item row into the database. Returns Error
  /// if the item already exists.
  pub async fn put_blob_item(&self, blob_item: BlobItemInput) -> DBResult<()> {
    let item = HashMap::from([
      (
        ATTR_BLOB_HASH.to_string(),
        AttributeValue::S(blob_item.blob_hash),
      ),
      (
        ATTR_HOLDER.to_string(),
        AttributeValue::S(BLOB_ITEM_ROW_HOLDER_VALUE.into()),
      ),
      (
        ATTR_S3_PATH.to_string(),
        AttributeValue::S(blob_item.s3_path.to_full_path()),
      ),
      (ATTR_UNCHECKED.to_string(), UncheckedKind::Blob.into()),
    ]);

    self.insert_item(item).await?;
    Ok(())
  }

  // Inserts a new holder assignment row into the database. Returns Error
  // if the item already exists or holder format is invalid.
  pub async fn put_holder_assignment(
    &self,
    blob_hash: impl Into<String>,
    holder: impl Into<String>,
  ) -> DBResult<()> {
    let blob_hash: String = blob_hash.into();
    let holder: String = holder.into();

    validate_holder(&holder)?;
    let item = HashMap::from([
      (ATTR_BLOB_HASH.to_string(), AttributeValue::S(blob_hash)),
      (ATTR_HOLDER.to_string(), AttributeValue::S(holder)),
      (ATTR_UNCHECKED.to_string(), UncheckedKind::Holder.into()),
    ]);

    self.insert_item(item).await?;
    Ok(())
  }

  /// Deletes a holder assignment row from the table.
  /// If the blob item for given holder assignment exists, it will be marked as unchecked.
  ///
  /// Returns Error if the holder format is invalid or race condition happened.
  /// Doesn't fail if the holder assignment didn't exist before.
  pub async fn delete_holder_assignment(
    &self,
    blob_hash: impl Into<String>,
    holder: impl Into<String>,
  ) -> DBResult<()> {
    let blob_hash: String = blob_hash.into();
    let holder: String = holder.into();
    validate_holder(&holder)?;
    let mut transaction = Vec::new();

    // delete the holder row
    let assignment_key = PrimaryKey {
      blob_hash: blob_hash.clone(),
      holder: holder.into(),
    };
    let delete_request = Delete::builder()
      .table_name(BLOB_TABLE_NAME)
      .set_key(Some(assignment_key.into()))
      .build();
    transaction
      .push(TransactWriteItem::builder().delete(delete_request).build());

    // mark the blob item as unchecked if exists
    let blob_primary_key = PrimaryKey::for_blob_item(blob_hash);
    if self.get_raw_item(blob_primary_key.clone()).await?.is_some() {
      let update_request = Update::builder()
        .table_name(BLOB_TABLE_NAME)
        .set_key(Some(blob_primary_key.into()))
        // even though we checked that the blob item exists, we still need to check it again
        // using DDB built-in conditions in case it was deleted in meantime
        .condition_expression(
          "attribute_exists(#blob_hash) AND attribute_exists(#holder)",
        )
        .update_expression("SET #unchecked = :unchecked, #last_modified = :now")
        .expression_attribute_names("#blob_hash", ATTR_BLOB_HASH)
        .expression_attribute_names("#holder", ATTR_HOLDER)
        .expression_attribute_names("#unchecked", ATTR_UNCHECKED)
        .expression_attribute_names("#last_modified", ATTR_LAST_MODIFIED)
        .expression_attribute_values(":unchecked", UncheckedKind::Blob.into())
        .expression_attribute_values(
          ":now",
          AttributeValue::N(Utc::now().timestamp_millis().to_string()),
        )
        .build();
      transaction
        .push(TransactWriteItem::builder().update(update_request).build());
    }

    self
      .ddb
      .transact_write_items()
      .set_transact_items(Some(transaction))
      .send()
      .await
      .map_err(|err| {
        debug!("DynamoDB client failed to run batch operation: {:?}", err);
        // TODO: Handle some Transaction cancellation as retriable error
        // This might happen if the blob item was deleted in meantime
        DBError::AwsSdk(err.into())
      })?;
    Ok(())
  }

  /// Performs multiple GetItem operations in batch.
  pub async fn get_multiple_items(
    &self,
    keys: Vec<PrimaryKey>,
  ) -> DBResult<Vec<DBRow>> {
    let rows = self.get_raw_items(keys).await?;
    rows.into_iter().map(DBRow::try_from).collect()
  }

  /// Queries the table for a list of holders for given blob hash.
  /// Optionally limits the number of results.
  pub async fn list_blob_holders(
    &self,
    blob_hash: impl Into<String>,
    limit: Option<i32>,
  ) -> DBResult<Vec<String>> {
    let response = self
      .ddb
      .query()
      .table_name(BLOB_TABLE_NAME)
      .projection_expression("#holder")
      .key_condition_expression("#blob_hash = :blob_hash")
      .expression_attribute_names("#blob_hash", ATTR_BLOB_HASH)
      .expression_attribute_names("#holder", ATTR_HOLDER)
      .expression_attribute_values(
        ":blob_hash",
        AttributeValue::S(blob_hash.into()),
      )
      .consistent_read(true)
      .set_limit(limit)
      .send()
      .await
      .map_err(|err| {
        error!("DynamoDB client failed to query holders: {:?}", err);
        DBError::AwsSdk(err.into())
      })?;

    let Some(items) = response.items else { return Ok(vec![]); };
    items
      .into_iter()
      .filter_map(|mut row| {
        // filter out rows that are blob items
        // we cannot do it in key condition expression - it doesn't support the <> operator
        // filter expression doesn't work either - it doesn't support filtering by sort key
        match parse_string_attribute(ATTR_HOLDER, row.remove(ATTR_HOLDER)) {
          Ok(value) if value.as_str() == BLOB_ITEM_ROW_HOLDER_VALUE => None,
          holder => Some(holder),
        }
      })
      .collect::<Result<Vec<_>, _>>()
      .map_err(|err| DBError::Attribute(err))
  }

  /// Returns a list of primary keys for "unchecked" items (blob / holder)
  /// that were last modified at least `min_age` ago.
  /// We need to specify if we want to get blob or holder items.
  pub async fn find_unchecked_items(
    &self,
    kind: UncheckedKind,
    min_age: chrono::Duration,
  ) -> DBResult<Vec<PrimaryKey>> {
    let created_until = Utc::now() - min_age;
    let timestamp = created_until.timestamp_millis();

    let response = self
      .ddb
      .query()
      .table_name(BLOB_TABLE_NAME)
      .index_name(UNCHECKED_INDEX_NAME)
      .key_condition_expression(
        "#unchecked = :kind AND #last_modified < :timestamp",
      )
      .expression_attribute_names("#unchecked", ATTR_UNCHECKED)
      .expression_attribute_names("#last_modified", ATTR_LAST_MODIFIED)
      .expression_attribute_values(":kind", kind.into())
      .expression_attribute_values(
        ":timestamp",
        AttributeValue::N(timestamp.to_string()),
      )
      .send()
      .await
      .map_err(|err| {
        error!("DynamoDB client failed to query unchecked items: {:?}", err);
        DBError::AwsSdk(err.into())
      })?;

    let Some(items) = response.items else { return Ok(vec![]); };
    items
      .into_iter()
      .map(PrimaryKey::try_from)
      .collect::<Result<Vec<_>, _>>()
  }

  /// For all rows in specified set of primary keys, removes
  /// the "unchecked" attribute using PutItem operation in batch.
  pub async fn batch_mark_checked(
    &self,
    keys: Vec<PrimaryKey>,
  ) -> DBResult<()> {
    let write_requests = self
      .get_raw_items(keys)
      .await?
      .into_iter()
      .filter_map(|mut row| {
        // filter out rows that are already checked
        // to save some write capacity
        if row.remove(ATTR_UNCHECKED).is_none() {
          return None;
        }
        let put_request = PutRequest::builder().set_item(Some(row)).build();
        let request = WriteRequest::builder().put_request(put_request).build();
        Some(request)
      })
      .collect();

    self
      .ddb
      .batch_write_item()
      .request_items(BLOB_TABLE_NAME, write_requests)
      .send()
      .await
      .map_err(|err| {
        error!("DynamoDB client failed to batch update rows");
        DBError::AwsSdk(err.into())
      })?;
    Ok(())
  }

  /// Performs multiple DeleteItem operations in batch
  pub async fn batch_delete_rows(&self, keys: Vec<PrimaryKey>) -> DBResult<()> {
    let write_requests = keys
      .into_iter()
      .map(|key| DeleteRequest::builder().set_key(Some(key.into())).build())
      .map(|request| WriteRequest::builder().delete_request(request).build())
      .collect::<Vec<_>>();

    self
      .ddb
      .batch_write_item()
      .request_items(BLOB_TABLE_NAME, write_requests)
      .send()
      .await
      .map_err(|err| {
        error!("DynamoDB client failed to batch delete rows: {:?}", err);
        DBError::AwsSdk(err.into())
      })?;

    Ok(())
  }
}

// private helpers
impl DatabaseClient {
  /// inserts a new item into the table using PutItem. Returns
  /// error if the item already exists
  async fn insert_item(
    &self,
    mut item: RawAttributes,
  ) -> DBResult<PutItemOutput> {
    // add metadata attributes common for all types of rows
    let now = Utc::now().timestamp_millis();
    item.insert(
      ATTR_CREATED_AT.to_string(),
      AttributeValue::N(now.to_string()),
    );
    item.insert(
      ATTR_LAST_MODIFIED.to_string(),
      AttributeValue::N(now.to_string()),
    );

    self
      .ddb
      .put_item()
      .table_name(BLOB_TABLE_NAME)
      .set_item(Some(item))
      // make sure we don't accidentaly overwrite existing row
      .condition_expression(
        "attribute_not_exists(#blob_hash) AND attribute_not_exists(#holder)",
      )
      .expression_attribute_names("#blob_hash", ATTR_BLOB_HASH)
      .expression_attribute_names("#holder", ATTR_HOLDER)
      .send()
      .await
      .map_err(|err| match DynamoDBError::from(err) {
        DynamoDBError::ConditionalCheckFailedException(e) => {
          debug!("DynamoDB client failed to insert: item already exists");
          trace!("Conditional check failed with error: {}", e);
          DBError::ItemAlreadyExists
        }
        err => {
          debug!("DynamoDB client failed to insert: {:?}", err);
          DBError::AwsSdk(err)
        }
      })
  }

  /// Gets a single row from the table using GetItem, without parsing it
  async fn get_raw_item(
    &self,
    key: PrimaryKey,
  ) -> DBResult<Option<RawAttributes>> {
    self
      .ddb
      .get_item()
      .table_name(BLOB_TABLE_NAME)
      .set_key(Some(key.into()))
      .send()
      .await
      .map_err(|err| {
        debug!("DynamoDB client failed to get item: {:?}", err);
        DBError::AwsSdk(err.into())
      })
      .map(|response| response.item)
  }

  /// Gets multiple rows from the table using BatchGetItem, without parsing them
  async fn get_raw_items(
    &self,
    keys: Vec<PrimaryKey>,
  ) -> DBResult<Vec<RawAttributes>> {
    let key_map = keys.into_iter().map(|key| key.into()).collect::<Vec<_>>();
    let request_items =
      KeysAndAttributes::builder().set_keys(Some(key_map)).build();

    let batch_output = self
      .ddb
      .batch_get_item()
      .request_items(BLOB_TABLE_NAME, request_items)
      .send()
      .await
      .map_err(|err| {
        error!("DynamoDB client failed to batch read rows: {:?}", err);
        DBError::AwsSdk(err.into())
      })?;

    let Some(responses) = batch_output.responses else { return Ok(vec![]); };

    // responses contains a map: table_name -> attributes
    let rows = responses.into_values().flatten().collect::<Vec<_>>();
    Ok(rows)
  }
}

fn validate_holder(holder: &str) -> DBResult<()> {
  if holder == BLOB_ITEM_ROW_HOLDER_VALUE || holder.len() < 3 {
    debug!("Invalid holder: {}", holder);
    return Err(DBError::Blob(BlobDBError::InvalidInput(holder.to_string())));
  }
  Ok(())
}
