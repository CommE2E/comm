use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::blob::types::BlobInfo;

use super::BackupVersionInfo;

#[cfg(feature = "blob-client")]
use crate::blob::client::BlobServiceClient;
#[cfg(feature = "aws")]
use crate::database::{
  AttributeExtractor, AttributeTryInto, DBItemError, TryFromAttribute,
};
#[cfg(feature = "aws")]
use aws_sdk_dynamodb::types::AttributeValue;

pub mod backup_table {
  pub const TABLE_NAME: &str = "backup-service-backup";
  pub const CREATED_INDEX: &str = "userID-created-index";

  pub mod attr {
    pub const USER_ID: &str = "userID";
    pub const BACKUP_ID: &str = "backupID";
    pub const CREATED: &str = "created";
    pub const USER_DATA: &str = "userData";
    pub const USER_KEYS: &str = "userKeys";
    pub const ATTACHMENTS: &str = "attachments";
    pub const SIWE_BACKUP_MSG: &str = "siweBackupMsg";
  }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BackupItem {
  pub user_id: String,
  pub backup_id: String,
  pub created: DateTime<Utc>,
  pub user_keys: BlobInfo,
  pub user_data: Option<BlobInfo>,
  pub attachments: Vec<BlobInfo>,
  pub siwe_backup_msg: Option<String>,
  #[serde(default)]
  pub total_size: u64,
  #[serde(default)]
  pub version_info: BackupVersionInfo,
}

impl BackupItem {
  pub fn new(
    user_id: String,
    backup_id: String,
    user_keys: BlobInfo,
    user_data: Option<BlobInfo>,
    attachments: Vec<BlobInfo>,
    siwe_backup_msg: Option<String>,
    total_size: u64,
    version_info: BackupVersionInfo,
  ) -> Self {
    BackupItem {
      user_id,
      backup_id,
      created: chrono::Utc::now(),
      user_keys,
      user_data,
      attachments,
      siwe_backup_msg,
      total_size,
      version_info,
    }
  }

  #[cfg(feature = "blob-client")]
  pub fn revoke_user_keys_holders(&self, blob_client: &BlobServiceClient) {
    blob_client.schedule_revoke_holder(
      &self.user_keys.blob_hash,
      &self.user_keys.holder,
    );
  }

  #[cfg(feature = "blob-client")]
  pub fn revoke_user_data_holders(&self, blob_client: &BlobServiceClient) {
    if let Some(user_data) = &self.user_data {
      blob_client
        .schedule_revoke_holder(&user_data.blob_hash, &user_data.holder);
    }

    for attachment_info in &self.attachments {
      blob_client.schedule_revoke_holder(
        &attachment_info.blob_hash,
        &attachment_info.holder,
      );
    }
  }

  #[cfg(feature = "aws")]
  pub fn item_key(
    user_id: &str,
    backup_id: &str,
  ) -> HashMap<String, AttributeValue> {
    HashMap::from([
      (
        backup_table::attr::USER_ID.to_string(),
        AttributeValue::S(user_id.to_string()),
      ),
      (
        backup_table::attr::BACKUP_ID.to_string(),
        AttributeValue::S(backup_id.to_string()),
      ),
    ])
  }
}

#[cfg(feature = "aws")]
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
    ]);

    if let Some(user_data) = value.user_data {
      attrs.insert(backup_table::attr::USER_DATA.to_string(), user_data.into());
    }

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

    if let Some(siwe_backup_msg_value) = value.siwe_backup_msg {
      attrs.insert(
        backup_table::attr::SIWE_BACKUP_MSG.to_string(),
        AttributeValue::S(siwe_backup_msg_value),
      );
    }
    attrs
  }
}

#[cfg(feature = "aws")]
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
    let user_data = value
      .remove(backup_table::attr::USER_DATA)
      .map(|attr| {
        BlobInfo::try_from_attr(backup_table::attr::USER_DATA, Some(attr))
      })
      .transpose()?;

    let attachments = value.remove(backup_table::attr::ATTACHMENTS);
    let attachments = if attachments.is_some() {
      attachments.attr_try_into(backup_table::attr::ATTACHMENTS)?
    } else {
      Vec::new()
    };

    let siwe_backup_msg: Option<String> =
      value.take_attr(backup_table::attr::SIWE_BACKUP_MSG)?;

    Ok(BackupItem {
      user_id,
      backup_id,
      created,
      user_keys,
      user_data,
      attachments,
      siwe_backup_msg,
      // TODO: Parse real values from DDB
      total_size: 0,
      version_info: Default::default(),
    })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_backup_item_deserialize_defaults() {
    // BackupItem is passed between services. It might happen that one service
    // has old implementation that doesn't include `total_size`
    // and `version_info` fields. It should deserialize the defaults then fields. It should insert the
    // defaults then.
    let payload = r#"{
      "user_id": "uid",
      "backup_id": "bid",
      "created":"2025-05-13T11:20:33.799712136Z",
      "user_keys": {"blobHash":"hash1","holder":"holder1"},
      "user_data": null,
      "attachments": [],
      "siwe_backup_msg": null
    }"#;

    let deserialized: BackupItem =
      serde_json::from_str(payload).expect("failed to deserialized BackupItem");

    assert_eq!(deserialized.total_size, 0u64);
    assert_eq!(deserialized.version_info.code_version, 0u16);
    assert_eq!(deserialized.version_info.state_version, 0u16);
    assert_eq!(deserialized.version_info.db_version, 0u16);
  }
}
