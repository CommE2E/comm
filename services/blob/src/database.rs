use anyhow::Result;
use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::s3::S3Path;

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
    unimplemented!();
  }

  pub async fn find_blob_item(
    &self,
    blob_hash: &str,
  ) -> Result<Option<BlobItem>> {
    unimplemented!();
  }

  pub async fn remove_blob_item(&self, blob_hash: &str) -> Result<()> {
    unimplemented!();
  }

  // Reverse index item

  pub async fn put_reverse_index_item(
    &self,
    reverse_index_item: ReverseIndexItem,
  ) -> Result<()> {
    unimplemented!();
  }

  pub async fn find_reverse_index_by_holder(
    &self,
    holder: &str,
  ) -> Result<Option<ReverseIndexItem>> {
    unimplemented!();
  }

  pub async fn find_reverse_index_by_hash(
    &self,
    blob_hash: &str,
  ) -> Result<Vec<ReverseIndexItem>> {
    unimplemented!();
  }

  pub async fn remove_reverse_index_item(&self, holder: &str) -> Result<()> {
    unimplemented!();
  }
}
