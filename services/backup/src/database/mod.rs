pub mod backup_item;
pub mod log_item;

use std::collections::HashMap;

use aws_sdk_dynamodb::{
  operation::get_item::GetItemOutput, types::AttributeValue,
};
use comm_services_lib::database::Error;
use tracing::error;

use crate::constants::{
  BACKUP_TABLE_FIELD_BACKUP_ID, BACKUP_TABLE_FIELD_USER_ID,
  BACKUP_TABLE_INDEX_USERID_CREATED, BACKUP_TABLE_NAME,
  LOG_TABLE_FIELD_ATTACHMENT_HOLDERS, LOG_TABLE_FIELD_BACKUP_ID,
  LOG_TABLE_FIELD_DATA_HASH, LOG_TABLE_FIELD_LOG_ID,
  LOG_TABLE_FIELD_PERSISTED_IN_BLOB, LOG_TABLE_FIELD_VALUE, LOG_TABLE_NAME,
};

use self::{
  backup_item::BackupItem,
  log_item::{parse_log_item, LogItem},
};

#[derive(Clone)]
pub struct DatabaseClient {
  client: aws_sdk_dynamodb::Client,
}

impl DatabaseClient {
  pub fn new(aws_config: &aws_types::SdkConfig) -> Self {
    DatabaseClient {
      client: aws_sdk_dynamodb::Client::new(aws_config),
    }
  }

  // backup item
  pub async fn put_backup_item(
    &self,
    backup_item: BackupItem,
  ) -> Result<(), Error> {
    let item = backup_item.into();

    self
      .client
      .put_item()
      .table_name(BACKUP_TABLE_NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to put backup item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn find_backup_item(
    &self,
    user_id: &str,
    backup_id: &str,
  ) -> Result<Option<BackupItem>, Error> {
    let item_key = HashMap::from([
      (
        BACKUP_TABLE_FIELD_USER_ID.to_string(),
        AttributeValue::S(user_id.to_string()),
      ),
      (
        BACKUP_TABLE_FIELD_BACKUP_ID.to_string(),
        AttributeValue::S(backup_id.to_string()),
      ),
    ]);

    match self
      .client
      .get_item()
      .table_name(BACKUP_TABLE_NAME)
      .set_key(Some(item_key))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find backup item");
        Error::AwsSdk(e.into())
      })? {
      GetItemOutput {
        item: Some(item), ..
      } => {
        let backup_item = item.try_into()?;
        Ok(Some(backup_item))
      }
      _ => Ok(None),
    }
  }

  pub async fn find_last_backup_item(
    &self,
    user_id: &str,
  ) -> Result<Option<BackupItem>, Error> {
    let response = self
      .client
      .query()
      .table_name(BACKUP_TABLE_NAME)
      .index_name(BACKUP_TABLE_INDEX_USERID_CREATED)
      .key_condition_expression("#userID = :valueToMatch")
      .expression_attribute_names("#userID", BACKUP_TABLE_FIELD_USER_ID)
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(user_id.to_string()),
      )
      .limit(1)
      .scan_index_forward(false)
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find last backup");
        Error::AwsSdk(e.into())
      })?;

    match response.items.unwrap_or_default().pop() {
      Some(item) => {
        let backup_item = item.try_into()?;
        Ok(Some(backup_item))
      }
      None => Ok(None),
    }
  }

  pub async fn remove_backup_item(&self, backup_id: &str) -> Result<(), Error> {
    self
      .client
      .delete_item()
      .table_name(BACKUP_TABLE_NAME)
      .key(
        BACKUP_TABLE_FIELD_BACKUP_ID,
        AttributeValue::S(backup_id.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to remove backup item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  // log item
  pub async fn put_log_item(&self, log_item: LogItem) -> Result<(), Error> {
    let item = HashMap::from([
      (
        LOG_TABLE_FIELD_BACKUP_ID.to_string(),
        AttributeValue::S(log_item.backup_id),
      ),
      (
        LOG_TABLE_FIELD_LOG_ID.to_string(),
        AttributeValue::S(log_item.log_id),
      ),
      (
        LOG_TABLE_FIELD_PERSISTED_IN_BLOB.to_string(),
        AttributeValue::Bool(log_item.persisted_in_blob),
      ),
      (
        LOG_TABLE_FIELD_VALUE.to_string(),
        AttributeValue::S(log_item.value),
      ),
      (
        LOG_TABLE_FIELD_DATA_HASH.to_string(),
        AttributeValue::S(log_item.data_hash),
      ),
      (
        LOG_TABLE_FIELD_ATTACHMENT_HOLDERS.to_string(),
        AttributeValue::S(log_item.attachment_holders),
      ),
    ]);

    self
      .client
      .put_item()
      .table_name(LOG_TABLE_NAME)
      .set_item(Some(item))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to put log item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }

  pub async fn find_log_item(
    &self,
    backup_id: &str,
    log_id: &str,
  ) -> Result<Option<LogItem>, Error> {
    let item_key = HashMap::from([
      (
        LOG_TABLE_FIELD_BACKUP_ID.to_string(),
        AttributeValue::S(backup_id.to_string()),
      ),
      (
        LOG_TABLE_FIELD_LOG_ID.to_string(),
        AttributeValue::S(log_id.to_string()),
      ),
    ]);

    match self
      .client
      .get_item()
      .table_name(LOG_TABLE_NAME)
      .set_key(Some(item_key))
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find log item");
        Error::AwsSdk(e.into())
      })? {
      GetItemOutput {
        item: Some(item), ..
      } => {
        let log_item = parse_log_item(item)?;
        Ok(Some(log_item))
      }
      _ => Ok(None),
    }
  }

  pub async fn find_log_items_for_backup(
    &self,
    backup_id: &str,
  ) -> Result<Vec<LogItem>, Error> {
    let response = self
      .client
      .query()
      .table_name(LOG_TABLE_NAME)
      .key_condition_expression("#backupID = :valueToMatch")
      .expression_attribute_names("#backupID", LOG_TABLE_FIELD_BACKUP_ID)
      .expression_attribute_values(
        ":valueToMatch",
        AttributeValue::S(backup_id.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find log items for backup");
        Error::AwsSdk(e.into())
      })?;

    if response.count == 0 {
      return Ok(Vec::new());
    }

    let mut results: Vec<LogItem> =
      Vec::with_capacity(response.count() as usize);
    for item in response.items.unwrap_or_default() {
      let log_item = parse_log_item(item)?;
      results.push(log_item);
    }
    Ok(results)
  }

  pub async fn remove_log_item(&self, log_id: &str) -> Result<(), Error> {
    self
      .client
      .delete_item()
      .table_name(LOG_TABLE_NAME)
      .key(
        LOG_TABLE_FIELD_LOG_ID,
        AttributeValue::S(log_id.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to remove log item");
        Error::AwsSdk(e.into())
      })?;

    Ok(())
  }
}
