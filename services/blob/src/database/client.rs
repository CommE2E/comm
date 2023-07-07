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

  /// Performs multiple GetItem operations in batch.
  pub async fn get_multiple_items(
    &self,
    keys: Vec<PrimaryKey>,
  ) -> DBResult<Vec<DBRow>> {
    let rows = self.get_raw_items(keys).await?;
    rows.into_iter().map(DBRow::try_from).collect()
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
