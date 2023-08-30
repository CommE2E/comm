use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use comm_services_lib::{
  blob::{client::BlobServiceClient, types::BlobInfo},
  database::{AttributeTryInto, DBItemError, TryFromAttribute},
};
use std::collections::HashMap;

use crate::constants::backup_table;

#[derive(Clone, Debug)]
pub struct BackupItem {
  pub user_id: String,
  pub backup_id: String,
  pub created: DateTime<Utc>,
  pub user_keys: BlobInfo,
  pub user_data: BlobInfo,
  pub attachments: Vec<BlobInfo>,
}

impl BackupItem {
  pub fn new(
    user_id: String,
    backup_id: String,
    user_keys: BlobInfo,
    user_data: BlobInfo,
    attachments: Vec<BlobInfo>,
  ) -> Self {
    BackupItem {
      user_id,
      backup_id,
      created: chrono::Utc::now(),
      user_keys,
      user_data,
      attachments,
    }
  }

  pub async fn revoke_holders(self, blob_client: &BlobServiceClient) {
    blob_client
      .schedule_revoke_holder(self.user_keys.blob_hash, self.user_keys.holder);

    blob_client
      .schedule_revoke_holder(self.user_data.blob_hash, self.user_data.holder);

    for attachment_info in self.attachments {
      blob_client.schedule_revoke_holder(
        attachment_info.blob_hash,
        attachment_info.holder,
      );
    }
  }
}

impl From<BackupItem> for HashMap<String, AttributeValue> {
  fn from(value: BackupItem) -> Self {
    let mut attrs = HashMap::from([
      (
        backup_table::attr::USER_ID.to_string(),
        AttributeValue::S(value.user_id),
      ),
      (
        backup_table::attr::BACKUP_ID.to_string(),
        AttributeValue::S(value.backup_id),
      ),
      (
        backup_table::attr::CREATED.to_string(),
        AttributeValue::S(value.created.to_rfc3339()),
      ),
      (
        backup_table::attr::USER_KEYS.to_string(),
        value.user_keys.into(),
      ),
      (
        backup_table::attr::USER_DATA.to_string(),
        value.user_data.into(),
      ),
    ]);

    if !value.attachments.is_empty() {
      attrs.insert(
        backup_table::attr::ATTACHMENTS.to_string(),
        AttributeValue::L(
          value
            .attachments
            .into_iter()
            .map(AttributeValue::from)
            .collect(),
        ),
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
      backup_table::attr::USER_ID,
      value.remove(backup_table::attr::USER_ID),
    )?;
    let backup_id = String::try_from_attr(
      backup_table::attr::BACKUP_ID,
      value.remove(backup_table::attr::BACKUP_ID),
    )?;
    let created = DateTime::<Utc>::try_from_attr(
      backup_table::attr::CREATED,
      value.remove(backup_table::attr::CREATED),
    )?;

    let user_keys = BlobInfo::try_from_attr(
      backup_table::attr::USER_KEYS,
      value.remove(backup_table::attr::USER_KEYS),
    )?;
    let user_data = BlobInfo::try_from_attr(
      backup_table::attr::USER_DATA,
      value.remove(backup_table::attr::USER_DATA),
    )?;

    let attachments = value.remove(backup_table::attr::ATTACHMENTS);
    let attachments = if attachments.is_some() {
      attachments.attr_try_into(backup_table::attr::ATTACHMENTS)?
    } else {
      vec![]
    };

    Ok(BackupItem {
      user_id,
      backup_id,
      created,
      user_keys,
      user_data,
      attachments,
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

    Ok(OrderedBackupItem {
      user_id,
      created,
      backup_id,
      user_keys,
    })
  }
}
