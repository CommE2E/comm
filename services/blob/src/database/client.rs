use aws_sdk_dynamodb::{
  operation::put_item::PutItemOutput,
  types::{
    AttributeValue, Delete, DeleteRequest, PutRequest, TransactWriteItem,
    Update, WriteRequest,
  },
  Error as DynamoDBError,
};
use chrono::Utc;
use comm_lib::{
  blob::types::BlobInfo,
  database::{
    self, batch_operations::ExponentialBackoffConfig, AttributeExtractor,
    TryFromAttribute,
  },
};
use std::collections::HashMap;
use tracing::{debug, error, trace};

use crate::constants::db::*;
use crate::constants::error_types;

use super::errors::{BlobDBError, Error as DBError};
use super::types::*;

#[derive(Clone)]
pub struct DatabaseClient {
  ddb: aws_sdk_dynamodb::Client,
}

/// public interface implementation
impl DatabaseClient {
  pub fn new(aws_config: &aws_config::SdkConfig) -> Self {
    DatabaseClient {
      ddb: aws_sdk_dynamodb::Client::new(aws_config),
    }
  }

  /// Gets a blob item row from the database by its blob hash
  /// Returns None if the blob item is not found
  pub async fn get_blob_item(
    &self,
    blob_hash: impl Into<String>,
  ) -> DBResult<Option<BlobItemRow>> {
    let key = PrimaryKey::for_blob_item(blob_hash);
    self
      .get_raw_item(key.clone())
      .await?
      .map(BlobItemRow::try_from)
      .transpose()
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

  /// Deletes blob item row. Doesn't delete its holders.
  pub async fn delete_blob_item(
    &self,
    blob_hash: impl Into<String>,
  ) -> DBResult<()> {
    let key = PrimaryKey::for_blob_item(blob_hash);
    self
      .ddb
      .delete_item()
      .table_name(BLOB_TABLE_NAME)
      .set_key(Some(key.into()))
      .send()
      .await
      .map_err(|err| {
        debug!("DynamoDB client failed to delete blob item: {:?}", err);
        DBError::AwsSdk(Box::new(err.into()))
      })?;
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

    let indexed_tag = get_indexable_tag(&holder, &[]);

    validate_holder(&holder)?;
    let mut item = HashMap::from([
      (ATTR_BLOB_HASH.to_string(), AttributeValue::S(blob_hash)),
      (ATTR_HOLDER.to_string(), AttributeValue::S(holder)),
      (ATTR_UNCHECKED.to_string(), UncheckedKind::Holder.into()),
    ]);

    if let Some(tag) = indexed_tag {
      item.insert(ATTR_INDEXED_TAG.to_string(), AttributeValue::S(tag));
    }

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
      holder,
    };
    let delete_request = Delete::builder()
      .table_name(BLOB_TABLE_NAME)
      .set_key(Some(assignment_key.into()))
      .build()
      .expect("key or table_name not set in Delete builder");
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
        .build()
        .expect(
          "key, table_name or update_expression not set in Update builder",
        );
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
        debug!("DynamoDB client failed to run transaction: {:?}", err);
        DBError::AwsSdk(Box::new(err.into()))
      })?;
    Ok(())
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
      // we need to increase limit by 1 because the blob item itself can be fetched too
      // it is filtered-out later
      .set_limit(limit.map(|it| it + 1))
      .send()
      .await
      .map_err(|err| {
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to query holders: {:?}", err
        );
        DBError::AwsSdk(Box::new(err.into()))
      })?;

    let Some(items) = response.items else {
      return Ok(vec![]);
    };
    items
      .into_iter()
      .filter_map(|mut row| {
        // filter out rows that are blob items
        // we cannot do it in key condition expression - it doesn't support the <> operator
        // filter expression doesn't work either - it doesn't support filtering by sort key
        match String::try_from_attr(ATTR_HOLDER, row.remove(ATTR_HOLDER)) {
          Ok(value) if value.as_str() == BLOB_ITEM_ROW_HOLDER_VALUE => None,
          holder => Some(holder),
        }
      })
      .collect::<Result<Vec<_>, _>>()
      .map_err(DBError::Attribute)
  }

  /// Returns a list of primary keys for rows that already exist in the table
  pub async fn list_existing_keys(
    &self,
    keys: impl IntoIterator<Item = PrimaryKey>,
  ) -> DBResult<Vec<PrimaryKey>> {
    database::batch_operations::batch_get(
      &self.ddb,
      BLOB_TABLE_NAME,
      keys,
      Some(format!("{}, {}", ATTR_BLOB_HASH, ATTR_HOLDER)),
      ExponentialBackoffConfig::default(),
    )
    .await?
    .into_iter()
    .map(PrimaryKey::try_from)
    .collect::<Result<Vec<_>, _>>()
  }

  pub async fn query_indexed_holders(
    &self,
    prefix: String,
  ) -> DBResult<Vec<BlobInfo>> {
    self
      .ddb
      .query()
      .table_name(BLOB_TABLE_NAME)
      .index_name(HOLDER_TAG_INDEX_NAME)
      .key_condition_expression("#indexed_tag = :prefix")
      .expression_attribute_names("#indexed_tag", HOLDER_TAG_INDEX_KEY_ATTR)
      .expression_attribute_values(":prefix", AttributeValue::S(prefix))
      .send()
      .await
      .map_err(|err| {
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to query indexed holders: {:?}", err
        );
        DBError::AwsSdk(Box::new(err.into()))
      })?
      .items
      .unwrap_or_default()
      .into_iter()
      .map(|mut item| {
        let blob_hash = item.take_attr(ATTR_BLOB_HASH)?;
        let holder = item.take_attr(ATTR_HOLDER)?;
        Ok(BlobInfo { blob_hash, holder })
      })
      .collect()
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
        error!(
          errorType = error_types::DDB_ERROR,
          "DynamoDB client failed to query unchecked items: {:?}", err
        );
        DBError::AwsSdk(Box::new(err.into()))
      })?;

    let Some(items) = response.items else {
      return Ok(vec![]);
    };
    items
      .into_iter()
      .map(PrimaryKey::try_from)
      .collect::<Result<Vec<_>, _>>()
  }

  /// For all rows in specified set of primary keys, removes
  /// the "unchecked" attribute using PutItem operation in batch.
  pub async fn batch_mark_checked(
    &self,
    keys: impl IntoIterator<Item = PrimaryKey>,
  ) -> DBResult<()> {
    let items_to_mark = database::batch_operations::batch_get(
      &self.ddb,
      BLOB_TABLE_NAME,
      keys,
      None,
      ExponentialBackoffConfig::default(),
    )
    .await?;

    let write_requests = items_to_mark
      .into_iter()
      .filter_map(|mut row| {
        // filter out rows that are already checked
        // to save some write capacity
        row.remove(ATTR_UNCHECKED)?;
        let put_request = PutRequest::builder()
          .set_item(Some(row))
          .build()
          .expect("item not set in PutRequest builder");
        let request = WriteRequest::builder().put_request(put_request).build();
        Some(request)
      })
      .collect();

    database::batch_operations::batch_write(
      &self.ddb,
      BLOB_TABLE_NAME,
      write_requests,
      ExponentialBackoffConfig::default(),
    )
    .await?;
    Ok(())
  }

  /// Performs multiple DeleteItem operations in batch
  pub async fn batch_delete_rows(
    &self,
    keys: impl IntoIterator<Item = PrimaryKey>,
  ) -> DBResult<()> {
    let write_requests = keys
      .into_iter()
      .map(|key| {
        DeleteRequest::builder()
          .set_key(Some(key.into()))
          .build()
          .expect("key not set in DeleteRequest builder")
      })
      .map(|request| WriteRequest::builder().delete_request(request).build())
      .collect::<Vec<_>>();

    database::batch_operations::batch_write(
      &self.ddb,
      BLOB_TABLE_NAME,
      write_requests,
      ExponentialBackoffConfig::default(),
    )
    .await?;

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
          DBError::AwsSdk(Box::new(err))
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
        DBError::AwsSdk(Box::new(err.into()))
      })
      .map(|response| response.item)
  }
}

fn validate_holder(holder: &str) -> DBResult<()> {
  if holder == BLOB_ITEM_ROW_HOLDER_VALUE {
    debug!("Invalid holder: {}", holder);
    return Err(DBError::Blob(BlobDBError::InvalidInput(holder.to_string())));
  }
  Ok(())
}

fn get_indexable_tag(holder: &str, tags: &[String]) -> Option<String> {
  const HOLDER_PREFIX_SEPARATOR: char = ':';

  if let Some(first_tag) = tags.first() {
    return Some(first_tag.to_string());
  }

  if !holder.contains(HOLDER_PREFIX_SEPARATOR) {
    return None;
  }

  holder
    .split(HOLDER_PREFIX_SEPARATOR)
    .next()
    .map(str::to_string)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn get_indexable_tag_no_tags_no_prefix() {
    let tag = get_indexable_tag("foo", &[]);
    assert!(tag.is_none());
  }

  #[test]
  fn get_indexable_tag_tags_no_prefix() {
    let tags = vec!["tag1".to_string(), "tag2".to_string()];
    let tag = get_indexable_tag("foo", &tags);
    assert_eq!(tag, Some("tag1".into()));
  }

  #[test]
  fn get_indexable_tag_tags_and_prefix() {
    let tags = vec!["tag1".to_string(), "tag2".to_string()];
    let tag = get_indexable_tag("device1:foo", &tags);
    assert_eq!(tag, Some("tag1".into()));
  }

  #[test]
  fn get_indexable_tag_prefix_no_tags() {
    let tag = get_indexable_tag("device1:foo", &[]);
    assert_eq!(tag, Some("device1".into()));
  }
}
