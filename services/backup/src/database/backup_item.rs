use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use comm_services_lib::{
  blob::types::BlobInfo,
  database::{DBItemError, TryFromAttribute},
};
use std::collections::{HashMap, HashSet};

use crate::constants::{
  BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS, BACKUP_TABLE_FIELD_BACKUP_ID,
  BACKUP_TABLE_FIELD_CREATED, BACKUP_TABLE_FIELD_USER_DATA,
  BACKUP_TABLE_FIELD_USER_ID, BACKUP_TABLE_FIELD_USER_KEYS,
};

#[derive(Clone, Debug)]
pub struct BackupItem {
  pub user_id: String,
  pub backup_id: String,
  pub created: DateTime<Utc>,
  pub user_keys: BlobInfo,
  pub user_data: BlobInfo,
  pub attachment_holders: HashSet<String>,
}

impl BackupItem {
  pub fn new(
    user_id: String,
    backup_id: String,
    user_keys: BlobInfo,
    user_data: BlobInfo,
    attachment_holders: HashSet<String>,
  ) -> Self {
    BackupItem {
      user_id,
      backup_id,
      created: chrono::Utc::now(),
      user_keys,
      user_data,
      attachment_holders,
    }
  }
}

impl From<BackupItem> for HashMap<String, AttributeValue> {
  fn from(value: BackupItem) -> Self {
    let mut attrs = HashMap::from([
      (
        BACKUP_TABLE_FIELD_USER_ID.to_string(),
        AttributeValue::S(value.user_id),
      ),
      (
        BACKUP_TABLE_FIELD_BACKUP_ID.to_string(),
        AttributeValue::S(value.backup_id),
      ),
      (
        BACKUP_TABLE_FIELD_CREATED.to_string(),
        AttributeValue::S(value.created.to_rfc3339()),
      ),
      (
        BACKUP_TABLE_FIELD_USER_KEYS.to_string(),
        value.user_keys.into(),
      ),
      (
        BACKUP_TABLE_FIELD_USER_DATA.to_string(),
        value.user_data.into(),
      ),
    ]);

    if !value.attachment_holders.is_empty() {
      attrs.insert(
        BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS.to_string(),
        AttributeValue::Ss(value.attachment_holders.into_iter().collect()),
      );
    }

    attrs
  }
}

impl TryFrom<HashMap<String, AttributeValue>> for BackupItem {
  type Error = DBItemError;

  fn try_from(
    mut value: HashMap<String, AttributeValue>,
  ) -> Result<Self, Self::Error> {
    let user_id = String::try_from_attr(
      BACKUP_TABLE_FIELD_USER_ID,
      value.remove(BACKUP_TABLE_FIELD_USER_ID),
    )?;
    let backup_id = String::try_from_attr(
      BACKUP_TABLE_FIELD_BACKUP_ID,
      value.remove(BACKUP_TABLE_FIELD_BACKUP_ID),
    )?;
    let created = DateTime::<Utc>::try_from_attr(
      BACKUP_TABLE_FIELD_CREATED,
      value.remove(BACKUP_TABLE_FIELD_CREATED),
    )?;

    let user_keys = BlobInfo::try_from_attr(
      BACKUP_TABLE_FIELD_USER_KEYS,
      value.remove(BACKUP_TABLE_FIELD_USER_KEYS),
    )?;
    let user_data = BlobInfo::try_from_attr(
      BACKUP_TABLE_FIELD_USER_DATA,
      value.remove(BACKUP_TABLE_FIELD_USER_DATA),
    )?;

    let attachments = value.remove(BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS);
    let attachment_holders = if attachments.is_some() {
      HashSet::<String>::try_from_attr(
        BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS,
        attachments,
      )?
    } else {
      HashSet::new()
    };

    Ok(BackupItem {
      user_id,
      backup_id,
      created,
      user_keys,
      user_data,
      attachment_holders,
    })
  }
}

/// Corresponds to the items in the [`crate::constants::BACKUP_TABLE_INDEX_USERID_CREATED`]
/// global index
#[derive(Clone, Debug)]
pub struct OrderedBackupItem {
  pub user_id: String,
  pub created: DateTime<Utc>,
  pub backup_id: String,
  pub user_keys: BlobInfo,
}

impl TryFrom<HashMap<String, AttributeValue>> for OrderedBackupItem {
  type Error = DBItemError;

  fn try_from(
    mut value: HashMap<String, AttributeValue>,
  ) -> Result<Self, Self::Error> {
    let user_id = String::try_from_attr(
      BACKUP_TABLE_FIELD_USER_ID,
      value.remove(BACKUP_TABLE_FIELD_USER_ID),
    )?;
    let created = DateTime::<Utc>::try_from_attr(
      BACKUP_TABLE_FIELD_CREATED,
      value.remove(BACKUP_TABLE_FIELD_CREATED),
    )?;
    let backup_id = String::try_from_attr(
      BACKUP_TABLE_FIELD_BACKUP_ID,
      value.remove(BACKUP_TABLE_FIELD_BACKUP_ID),
    )?;

    let user_keys = BlobInfo::try_from_attr(
      BACKUP_TABLE_FIELD_USER_KEYS,
      value.remove(BACKUP_TABLE_FIELD_USER_KEYS),
    )?;

    Ok(OrderedBackupItem {
      user_id,
      created,
      backup_id,
      user_keys,
    })
  }
}
