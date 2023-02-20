use aws_sdk_dynamodb::{
  model::AttributeValue, output::GetItemOutput, Error as DynamoDBError,
};
use chrono::{DateTime, Utc};
use rust_lib::database::{self, DBItemError};
use std::{
  collections::HashMap,
  fmt::{Display, Formatter},
  sync::Arc,
};
use tracing::error;

use crate::{
  constants::{
    BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD,
    BLOB_REVERSE_INDEX_TABLE_HASH_INDEX_NAME,
    BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD, BLOB_REVERSE_INDEX_TABLE_NAME,
    BLOB_TABLE_BLOB_HASH_FIELD, BLOB_TABLE_CREATED_FIELD, BLOB_TABLE_NAME,
    BLOB_TABLE_S3_PATH_FIELD,
  },
  s3::S3Path,
};

#[derive(Clone, Debug)]
pub struct BlobItem {
  pub blob_hash: String,
  pub s3_path: S3Path,
  pub created: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct ReverseIndexItem {
  pub holder: String,
  pub blob_hash: String,
}

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<aws_sdk_dynamodb::Client>,
}

impl DatabaseClient {
  pub fn new(aws_config: &aws_types::SdkConfig) -> Self {
    DatabaseClient {
      client: Arc::new(aws_sdk_dynamodb::Client::new(aws_config)),
    }
  }

  // Blob item

  pub async fn put_blob_item(&self, blob_item: BlobItem) -> Result<(), Error> {
    let item = HashMap::from([
      (
        BLOB_TABLE_BLOB_HASH_FIELD.to_string(),
        AttributeValue::S(blob_item.blob_hash),
      ),
      (
        BLOB_TABLE_S3_PATH_FIELD.to_string(),
        AttributeValue::S(blob_item.s3_path.to_full_path()),
      ),
      (
        BLOB_TABLE_CREATED_FIELD.to_string(),
        AttributeValue::S(blob_item.created.to_rfc3339()),
      ),
    ]);

    self
      .client
      .put_item()
      .table_name(BLOB_TABLE_NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to put blob item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn find_blob_item(
    &self,
    blob_hash: &str,
  ) -> Result<Option<BlobItem>, Error> {
    let item_key = HashMap::from([(
      BLOB_TABLE_BLOB_HASH_FIELD.to_string(),
      AttributeValue::S(blob_hash.to_string()),
    )]);
    match self
      .client
      .get_item()
      .table_name(BLOB_TABLE_NAME)
      .set_key(Some(item_key))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find blob item");
        Error::AwsSdk(e.into())
      })? {
      GetItemOutput {
        item: Some(mut item),
        ..
      } => {
        let blob_hash = database::parse_string_attribute(
          BLOB_TABLE_BLOB_HASH_FIELD,
          item.remove(BLOB_TABLE_BLOB_HASH_FIELD),
        )?;
        let s3_path = database::parse_string_attribute(
          BLOB_TABLE_S3_PATH_FIELD,
          item.remove(BLOB_TABLE_S3_PATH_FIELD),
        )?;
        let created = database::parse_datetime_attribute(
          BLOB_TABLE_CREATED_FIELD,
          item.remove(BLOB_TABLE_CREATED_FIELD),
        )?;
        Ok(Some(BlobItem {
          blob_hash,
          s3_path: S3Path::from_full_path(&s3_path)
            .map_err(|e| Error::Blob(BlobDBError::InvalidS3Path(e)))?,
          created,
        }))
      }
      _ => Ok(None),
    }
  }

  pub async fn remove_blob_item(&self, blob_hash: &str) -> Result<(), Error> {
    self
      .client
      .delete_item()
      .table_name(BLOB_TABLE_NAME)
      .key(
        BLOB_TABLE_BLOB_HASH_FIELD,
        AttributeValue::S(blob_hash.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to remove blob item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  // Reverse index item

  pub async fn put_reverse_index_item(
    &self,
    reverse_index_item: ReverseIndexItem,
  ) -> Result<(), Error> {
    let holder = &reverse_index_item.holder;
    if self.find_reverse_index_by_holder(holder).await?.is_some() {
      error!("Failed to put reverse index. Holder already exists.");
      return Err(Error::Blob(BlobDBError::HolderAlreadyExists(
        holder.to_string(),
      )));
    }

    let item = HashMap::from([
      (
        BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD.to_string(),
        AttributeValue::S(reverse_index_item.holder),
      ),
      (
        BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD.to_string(),
        AttributeValue::S(reverse_index_item.blob_hash),
      ),
    ]);
    self
      .client
      .put_item()
      .table_name(BLOB_REVERSE_INDEX_TABLE_NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to put reverse index");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn find_reverse_index_by_holder(
    &self,
    holder: &str,
  ) -> Result<Option<ReverseIndexItem>, Error> {
    let item_key = HashMap::from([(
      BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD.to_string(),
      AttributeValue::S(holder.to_string()),
    )]);
    match self
      .client
      .get_item()
      .table_name(BLOB_REVERSE_INDEX_TABLE_NAME)
      .set_key(Some(item_key))
      .consistent_read(true)
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find reverse index by holder");
        Error::AwsSdk(e.into())
      })? {
      GetItemOutput {
        item: Some(mut item),
        ..
      } => {
        let holder = database::parse_string_attribute(
          BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD,
          item.remove(BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD),
        )?;
        let blob_hash = database::parse_string_attribute(
          BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD,
          item.remove(BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD),
        )?;

        Ok(Some(ReverseIndexItem { holder, blob_hash }))
      }
      _ => Ok(None),
    }
  }

  pub async fn find_reverse_index_by_hash(
    &self,
    blob_hash: &str,
  ) -> Result<Vec<ReverseIndexItem>, Error> {
    let response = self
      .client
      .query()
      .table_name(BLOB_REVERSE_INDEX_TABLE_NAME)
      .index_name(BLOB_REVERSE_INDEX_TABLE_HASH_INDEX_NAME)
      .key_condition_expression("#blobHash = :valueToMatch")
      .expression_attribute_names(
        "#blobHash",
        BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD,
      )
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(blob_hash.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find reverse indexes by hash");
        Error::AwsSdk(e.into())
      })?;

    if response.count == 0 {
      return Ok(vec![]);
    }

    let mut results: Vec<ReverseIndexItem> =
      Vec::with_capacity(response.count() as usize);
    for mut item in response.items.unwrap_or_default() {
      let holder = database::parse_string_attribute(
        BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD,
        item.remove(BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD),
      )?;
      let blob_hash = database::parse_string_attribute(
        BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD,
        item.remove(BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD),
      )?;

      results.push(ReverseIndexItem { holder, blob_hash });
    }

    return Ok(results);
  }

  pub async fn remove_reverse_index_item(
    &self,
    holder: &str,
  ) -> Result<(), Error> {
    self
      .client
      .delete_item()
      .table_name(BLOB_REVERSE_INDEX_TABLE_NAME)
      .key(
        BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD,
        AttributeValue::S(holder.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to remove reverse index");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
  #[display(...)]
  Blob(BlobDBError),
}

#[derive(Debug)]
pub enum BlobDBError {
  HolderAlreadyExists(String),
  InvalidS3Path(anyhow::Error),
}

impl Display for BlobDBError {
  fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
    match self {
      BlobDBError::HolderAlreadyExists(holder) => {
        write!(f, "Item for given holder [{}] already exists", holder)
      }
      BlobDBError::InvalidS3Path(err) => err.fmt(f),
    }
  }
}

impl std::error::Error for BlobDBError {}
