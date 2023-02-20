use aws_sdk_dynamodb::{model::AttributeValue, output::GetItemOutput};
use chrono::{DateTime, Utc};
use comm_services_lib::database::{self, DBItemError, Error};
use std::{collections::HashMap, sync::Arc};
use tracing::error;

use crate::constants::{
  BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS, BACKUP_TABLE_FIELD_BACKUP_ID,
  BACKUP_TABLE_FIELD_COMPACTION_HOLDER, BACKUP_TABLE_FIELD_CREATED,
  BACKUP_TABLE_FIELD_RECOVERY_DATA, BACKUP_TABLE_FIELD_USER_ID,
  BACKUP_TABLE_INDEX_USERID_CREATED, BACKUP_TABLE_NAME,
  LOG_TABLE_FIELD_ATTACHMENT_HOLDERS, LOG_TABLE_FIELD_BACKUP_ID,
  LOG_TABLE_FIELD_DATA_HASH, LOG_TABLE_FIELD_LOG_ID,
  LOG_TABLE_FIELD_PERSISTED_IN_BLOB, LOG_TABLE_FIELD_VALUE, LOG_TABLE_NAME,
};

#[derive(Clone, Debug)]
pub struct BackupItem {
  pub user_id: String,
  pub backup_id: String,
  pub created: DateTime<Utc>,
  pub recovery_data: String,
  pub compaction_holder: String,
  pub attachment_holders: String,
}

impl BackupItem {
  pub fn new(
    user_id: String,
    backup_id: String,
    compaction_holder: String,
  ) -> Self {
    BackupItem {
      user_id,
      backup_id,
      compaction_holder,
      created: chrono::Utc::now(),
      // TODO: Recovery data is mocked with random string
      recovery_data: crate::utils::generate_random_string(
        20,
        &mut rand::thread_rng(),
      ),
      attachment_holders: String::new(),
    }
  }
}

static LOG_ITEM_HEADERS_SIZE: usize = {
  let mut size: usize = 0;
  size += LOG_TABLE_FIELD_BACKUP_ID.as_bytes().len();
  size += LOG_TABLE_FIELD_LOG_ID.as_bytes().len();
  size += LOG_TABLE_FIELD_PERSISTED_IN_BLOB.as_bytes().len();
  size += LOG_TABLE_FIELD_VALUE.as_bytes().len();
  size += LOG_TABLE_FIELD_ATTACHMENT_HOLDERS.as_bytes().len();
  size += LOG_TABLE_FIELD_DATA_HASH.as_bytes().len();
  size
};

#[derive(Clone, Debug)]
pub struct LogItem {
  pub backup_id: String,
  pub log_id: String,
  pub persisted_in_blob: bool,
  pub value: String,
  pub attachment_holders: String,
  pub data_hash: String,
}

impl LogItem {
  /// Calculates size based on raw log item components,
  /// without allocating a new item
  pub fn size_from_components(
    backup_id: &str,
    log_id: &str,
    log_hash: &str,
    data: &[u8],
  ) -> usize {
    let mut size: usize = LOG_ITEM_HEADERS_SIZE;
    size += backup_id.as_bytes().len();
    size += log_id.as_bytes().len();
    size += data.len();
    size += log_hash.as_bytes().len();

    // persistent in blob, attachment holders, use defaults here
    size += false.to_string().as_bytes().len();
    size += "".as_bytes().len();

    size
  }

  /// Total size of this item in the DynamoDB table. This value must be
  /// smaller than [`crate::constants::LOG_DATA_SIZE_DATABASE_LIMIT`]
  /// in order to successfully put this item into a DynamoDB database.
  pub fn total_size(&self) -> usize {
    let mut size: usize = LOG_ITEM_HEADERS_SIZE;
    size += self.backup_id.as_bytes().len();
    size += self.log_id.as_bytes().len();
    size += self.persisted_in_blob.to_string().as_bytes().len();
    size += self.value.as_bytes().len();
    size += self.attachment_holders.as_bytes().len();
    size += self.data_hash.as_bytes().len();
    size
  }
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
    let item = HashMap::from([
      (
        BACKUP_TABLE_FIELD_USER_ID.to_string(),
        AttributeValue::S(backup_item.user_id),
      ),
      (
        BACKUP_TABLE_FIELD_CREATED.to_string(),
        AttributeValue::S(backup_item.created.to_rfc3339()),
      ),
      (
        BACKUP_TABLE_FIELD_BACKUP_ID.to_string(),
        AttributeValue::S(backup_item.backup_id),
      ),
      (
        BACKUP_TABLE_FIELD_RECOVERY_DATA.to_string(),
        AttributeValue::S(backup_item.recovery_data),
      ),
      (
        BACKUP_TABLE_FIELD_COMPACTION_HOLDER.to_string(),
        AttributeValue::S(backup_item.compaction_holder),
      ),
      (
        BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS.to_string(),
        AttributeValue::S(backup_item.attachment_holders),
      ),
    ]);

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
        let backup_item = parse_backup_item(item)?;
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
        let backup_item = parse_backup_item(item)?;
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

fn parse_backup_item(
  mut item: HashMap<String, AttributeValue>,
) -> Result<BackupItem, DBItemError> {
  let user_id = database::parse_string_attribute(
    BACKUP_TABLE_FIELD_USER_ID,
    item.remove(BACKUP_TABLE_FIELD_USER_ID),
  )?;
  let backup_id = database::parse_string_attribute(
    BACKUP_TABLE_FIELD_BACKUP_ID,
    item.remove(BACKUP_TABLE_FIELD_BACKUP_ID),
  )?;
  let created = database::parse_datetime_attribute(
    BACKUP_TABLE_FIELD_CREATED,
    item.remove(BACKUP_TABLE_FIELD_CREATED),
  )?;
  let recovery_data = database::parse_string_attribute(
    BACKUP_TABLE_FIELD_RECOVERY_DATA,
    item.remove(BACKUP_TABLE_FIELD_RECOVERY_DATA),
  )?;
  let compaction_holder = database::parse_string_attribute(
    BACKUP_TABLE_FIELD_COMPACTION_HOLDER,
    item.remove(BACKUP_TABLE_FIELD_COMPACTION_HOLDER),
  )?;
  let attachment_holders = database::parse_string_attribute(
    BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS,
    item.remove(BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS),
  )?;
  Ok(BackupItem {
    user_id,
    backup_id,
    created,
    recovery_data,
    compaction_holder,
    attachment_holders,
  })
}

fn parse_log_item(
  mut item: HashMap<String, AttributeValue>,
) -> Result<LogItem, DBItemError> {
  let backup_id = database::parse_string_attribute(
    LOG_TABLE_FIELD_BACKUP_ID,
    item.remove(LOG_TABLE_FIELD_BACKUP_ID),
  )?;
  let log_id = database::parse_string_attribute(
    LOG_TABLE_FIELD_LOG_ID,
    item.remove(LOG_TABLE_FIELD_LOG_ID),
  )?;
  let persisted_in_blob = database::parse_bool_attribute(
    LOG_TABLE_FIELD_PERSISTED_IN_BLOB,
    item.remove(LOG_TABLE_FIELD_PERSISTED_IN_BLOB),
  )?;
  let value = database::parse_string_attribute(
    LOG_TABLE_FIELD_VALUE,
    item.remove(LOG_TABLE_FIELD_VALUE),
  )?;
  let data_hash = database::parse_string_attribute(
    LOG_TABLE_FIELD_DATA_HASH,
    item.remove(LOG_TABLE_FIELD_DATA_HASH),
  )?;
  let attachment_holders = database::parse_string_attribute(
    LOG_TABLE_FIELD_ATTACHMENT_HOLDERS,
    item.remove(LOG_TABLE_FIELD_ATTACHMENT_HOLDERS),
  )?;
  Ok(LogItem {
    log_id,
    backup_id,
    persisted_in_blob,
    value,
    data_hash,
    attachment_holders,
  })
}
