use chrono::{DateTime, Utc};
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct BackupItem {
  pub user_id: String,
  pub backup_id: String,
  pub created: DateTime<Utc>,
  pub recovery_data: String,
  pub compaction_holder: String,
  pub attachment_holders: String,
}

#[derive(Clone, Debug)]
pub struct LogItem {
  pub backup_id: String,
  pub log_id: String,
  pub persisted_in_blob: bool,
  pub value: String,
  pub attachment_holders: String,
  pub data_hash: String,
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

  // backup item
  pub async fn put_backup_item(
    &self,
    backup_item: BackupItem,
  ) -> Result<(), Error> {
    unimplemented!()
  }

  pub async fn find_backup_item(
    &self,
    user_id: &str,
    backup_id: &str,
  ) -> Result<Option<BackupItem>, Error> {
    unimplemented!()
  }

  pub async fn find_last_backup_item(
    &self,
    user_id: &str,
  ) -> Result<Option<BackupItem>, Error> {
    unimplemented!()
  }

  pub async fn remove_backup_item(&self, backup_id: &str) -> Result<(), Error> {
    unimplemented!()
  }

  // log item
  pub async fn put_log_item(&self, log_item: LogItem) -> Result<(), Error> {
    unimplemented!()
  }

  pub async fn find_log_item(
    &self,
    backup_id: &str,
    log_id: &str,
  ) -> Result<Option<LogItem>, Error> {
    unimplemented!()
  }

  pub async fn find_log_items_for_backup(
    &self,
    backup_id: &str,
  ) -> Result<Vec<LogItem>, Error> {
    unimplemented!()
  }

  pub async fn remove_log_item(&self, log_id: &str) -> Result<(), Error> {
    unimplemented!()
  }
}

// TODO: Replace this with dedicated DB error
type Error = anyhow::Error;
