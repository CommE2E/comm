use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use comm_services_lib::database::{DBItemError, TryFromAttribute};
use std::collections::HashMap;

use crate::constants::{
  BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS, BACKUP_TABLE_FIELD_BACKUP_ID,
  BACKUP_TABLE_FIELD_COMPACTION_HOLDER, BACKUP_TABLE_FIELD_CREATED,
  BACKUP_TABLE_FIELD_RECOVERY_DATA, BACKUP_TABLE_FIELD_USER_ID,
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

pub fn parse_backup_item(
  mut item: HashMap<String, AttributeValue>,
) -> Result<BackupItem, DBItemError> {
  let user_id = String::try_from_attr(
    BACKUP_TABLE_FIELD_USER_ID,
    item.remove(BACKUP_TABLE_FIELD_USER_ID),
  )?;
  let backup_id = String::try_from_attr(
    BACKUP_TABLE_FIELD_BACKUP_ID,
    item.remove(BACKUP_TABLE_FIELD_BACKUP_ID),
  )?;
  let created = DateTime::<Utc>::try_from_attr(
    BACKUP_TABLE_FIELD_CREATED,
    item.remove(BACKUP_TABLE_FIELD_CREATED),
  )?;
  let recovery_data = String::try_from_attr(
    BACKUP_TABLE_FIELD_RECOVERY_DATA,
    item.remove(BACKUP_TABLE_FIELD_RECOVERY_DATA),
  )?;
  let compaction_holder = String::try_from_attr(
    BACKUP_TABLE_FIELD_COMPACTION_HOLDER,
    item.remove(BACKUP_TABLE_FIELD_COMPACTION_HOLDER),
  )?;
  let attachment_holders = String::try_from_attr(
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
