use crate::constants::backup_table;
use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use comm_lib::{
  backup::BackupVersionInfo,
  blob::types::BlobInfo,
  database::{
    parse_int_attribute, AttributeExtractor, DBItemError, TryFromAttribute,
  },
};
use std::collections::HashMap;

pub use comm_lib::backup::database::BackupItem;

/// Corresponds to the items in the [`crate::constants::BACKUP_TABLE_INDEX_USERID_CREATED`]
/// global index
#[derive(Clone, Debug)]
pub struct OrderedBackupItem {
  pub user_id: String,
  pub created: DateTime<Utc>,
  pub backup_id: String,
  pub user_keys: BlobInfo,
  pub siwe_backup_msg: Option<String>,
  pub total_size: u64,
  pub version_info: BackupVersionInfo,
}

impl TryFrom<HashMap<String, AttributeValue>> for OrderedBackupItem {
  type Error = DBItemError;

  fn try_from(
    mut value: HashMap<String, AttributeValue>,
  ) -> Result<Self, Self::Error> {
    let user_id = String::try_from_attr(
      backup_table::attr::USER_ID,
      value.remove(backup_table::attr::USER_ID),
    )?;
    let created = DateTime::<Utc>::try_from_attr(
      backup_table::attr::CREATED,
      value.remove(backup_table::attr::CREATED),
    )?;
    let backup_id = String::try_from_attr(
      backup_table::attr::BACKUP_ID,
      value.remove(backup_table::attr::BACKUP_ID),
    )?;

    let user_keys = BlobInfo::try_from_attr(
      backup_table::attr::USER_KEYS,
      value.remove(backup_table::attr::USER_KEYS),
    )?;

    let siwe_backup_msg: Option<String> =
      value.take_attr(backup_table::attr::SIWE_BACKUP_MSG)?;

    let size_attr = value.remove(backup_table::attr::TOTAL_SIZE);
    let total_size = if size_attr.is_some() {
      parse_int_attribute(backup_table::attr::TOTAL_SIZE, size_attr)?
    } else {
      0u64
    };

    // older backups don't have this attribute
    let version_info: BackupVersionInfo = value
      .take_attr::<Option<_>>(backup_table::attr::VERSION_INFO)?
      .unwrap_or_default();

    Ok(OrderedBackupItem {
      user_id,
      created,
      backup_id,
      user_keys,
      siwe_backup_msg,
      total_size,
      version_info,
    })
  }
}
