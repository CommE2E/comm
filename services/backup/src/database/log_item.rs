use std::collections::HashMap;

use aws_sdk_dynamodb::types::AttributeValue;
use comm_services_lib::database::{DBItemError, TryFromAttribute};

use crate::constants::{
  LOG_TABLE_FIELD_ATTACHMENT_HOLDERS, LOG_TABLE_FIELD_BACKUP_ID,
  LOG_TABLE_FIELD_DATA_HASH, LOG_TABLE_FIELD_LOG_ID,
  LOG_TABLE_FIELD_PERSISTED_IN_BLOB, LOG_TABLE_FIELD_VALUE,
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

pub fn parse_log_item(
  mut item: HashMap<String, AttributeValue>,
) -> Result<LogItem, DBItemError> {
  let backup_id = String::try_from_attr(
    LOG_TABLE_FIELD_BACKUP_ID,
    item.remove(LOG_TABLE_FIELD_BACKUP_ID),
  )?;
  let log_id = String::try_from_attr(
    LOG_TABLE_FIELD_LOG_ID,
    item.remove(LOG_TABLE_FIELD_LOG_ID),
  )?;
  let persisted_in_blob = bool::try_from_attr(
    LOG_TABLE_FIELD_PERSISTED_IN_BLOB,
    item.remove(LOG_TABLE_FIELD_PERSISTED_IN_BLOB),
  )?;
  let value = String::try_from_attr(
    LOG_TABLE_FIELD_VALUE,
    item.remove(LOG_TABLE_FIELD_VALUE),
  )?;
  let data_hash = String::try_from_attr(
    LOG_TABLE_FIELD_DATA_HASH,
    item.remove(LOG_TABLE_FIELD_DATA_HASH),
  )?;
  let attachment_holders = String::try_from_attr(
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
