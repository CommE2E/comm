use anyhow::{anyhow, Context, Result};
use aws_sdk_dynamodb::{model::AttributeValue, output::GetItemOutput};
use chrono::{DateTime, Utc};
use std::{collections::HashMap, sync::Arc};

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

  pub async fn put_blob_item(&self, blob_item: BlobItem) -> Result<()> {
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
      .context("Failed to put blob item")?;

    Ok(())
  }

  pub async fn find_blob_item(
    &self,
    blob_hash: &str,
  ) -> Result<Option<BlobItem>> {
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
      .with_context(|| {
        format!("Failed to find blob item with hash: [{}]", blob_hash)
      })? {
      GetItemOutput {
        item: Some(mut item),
        ..
      } => {
        let blob_hash =
          parse_string_attribute(item.remove(BLOB_TABLE_BLOB_HASH_FIELD))?;
        let s3_path =
          parse_string_attribute(item.remove(BLOB_TABLE_S3_PATH_FIELD))?;
        let created =
          parse_datetime_attribute(item.remove(BLOB_TABLE_CREATED_FIELD))?;
        Ok(Some(BlobItem {
          blob_hash,
          s3_path: S3Path::from_full_path(&s3_path)?,
          created,
        }))
      }
      _ => Ok(None),
    }
  }

  pub async fn remove_blob_item(&self, blob_hash: &str) -> Result<()> {
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
      .with_context(|| {
        format!("Failed to remove blob item with hash: [{}]", blob_hash)
      })?;

    Ok(())
  }

  // Reverse index item

  pub async fn put_reverse_index_item(
    &self,
    reverse_index_item: ReverseIndexItem,
  ) -> Result<()> {
    if self
      .find_reverse_index_by_holder(&reverse_index_item.holder)
      .await?
      .is_some()
    {
      return Err(anyhow!(
        "An item for the given holder [{}] already exists",
        reverse_index_item.holder
      ));
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
      .context("Failed to put reverse index item")?;

    Ok(())
  }

  pub async fn find_reverse_index_by_holder(
    &self,
    holder: &str,
  ) -> Result<Option<ReverseIndexItem>> {
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
      .with_context(|| {
        format!("Failed to find reverse index for holder: [{}]", holder)
      })? {
      GetItemOutput {
        item: Some(mut item),
        ..
      } => {
        let holder = parse_string_attribute(
          item.remove(BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD),
        )?;
        let blob_hash = parse_string_attribute(
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
  ) -> Result<Vec<ReverseIndexItem>> {
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
      .consistent_read(true)
      .send()
      .await
      .with_context(|| {
        format!("Failed to find reverse index for hash: [{}]", blob_hash)
      })?;

    if response.count == 0 {
      return Ok(vec![]);
    }

    let mut results: Vec<ReverseIndexItem> =
      Vec::with_capacity(response.count() as usize);
    for mut item in response.items.unwrap_or_default() {
      let holder = parse_string_attribute(
        item.remove(BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD),
      )?;
      let blob_hash = parse_string_attribute(
        item.remove(BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD),
      )?;

      results.push(ReverseIndexItem { holder, blob_hash });
    }

    return Ok(results);
  }

  pub async fn remove_reverse_index_item(&self, holder: &str) -> Result<()> {
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
      .with_context(|| {
        format!("Failed to remove reverse index for holder: [{}]", holder)
      })?;

    Ok(())
  }
}

fn parse_string_attribute(attribute: Option<AttributeValue>) -> Result<String> {
  match attribute {
    Some(AttributeValue::S(str_value)) => Ok(str_value),
    Some(_) => Err(anyhow!("Incorrect type")),
    None => Err(anyhow!("Atrribute missing")),
  }
}

fn parse_datetime_attribute(
  attribute: Option<AttributeValue>,
) -> Result<DateTime<Utc>> {
  if let Some(AttributeValue::S(datetime)) = &attribute {
    datetime
      .parse()
      .with_context(|| format!("Invalid RFC 3339 DateTime: {}", datetime))
  } else {
    Err(anyhow!("Atrribute missing"))
  }
}
