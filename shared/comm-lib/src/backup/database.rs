use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::blob::types::BlobInfo;

use super::BackupVersionInfo;

#[cfg(feature = "blob-client")]
use crate::blob::client::BlobServiceClient;
#[cfg(feature = "aws")]
use crate::database::{
  parse_int_attribute, AttributeExtractor, AttributeMap, AttributeTryInto,
  DBItemError, TryFromAttribute,
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
    pub const TOTAL_SIZE: &str = "totalSize";
    pub const VERSION_INFO: &str = "versionInfo";

    pub mod version_info {
      pub const CODE_VERSION: &str = "codeVersion";
      pub const STATE_VERSION: &str = "stateVersion";
      pub const DB_VERSION: &str = "dbVersion";
    }
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
impl From<BackupItem> for AttributeMap {
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
        backup_table::attr::TOTAL_SIZE.to_string(),
        AttributeValue::N(value.total_size.to_string()),
      ),
      (
        backup_table::attr::VERSION_INFO.to_string(),
        value.version_info.into(),
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
impl TryFrom<AttributeMap> for BackupItem {
  type Error = DBItemError;

  fn try_from(mut value: AttributeMap) -> Result<Self, Self::Error> {
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

    Ok(BackupItem {
      user_id,
      backup_id,
      created,
      user_keys,
      user_data,
      attachments,
      siwe_backup_msg,
      total_size,
      version_info,
    })
  }
}

#[cfg(feature = "aws")]
impl TryFromAttribute for BackupVersionInfo {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    let mut map_attrs = AttributeMap::try_from_attr(attribute_name, attribute)?;

    use backup_table::attr::version_info::*;
    let code_version_attr = map_attrs.remove(CODE_VERSION);
    let state_version_attr = map_attrs.remove(STATE_VERSION);
    let db_version_attr = map_attrs.remove(DB_VERSION);

    let code_version = parse_int_attribute(CODE_VERSION, code_version_attr)?;
    let state_version = parse_int_attribute(STATE_VERSION, state_version_attr)?;
    let db_version = parse_int_attribute(DB_VERSION, db_version_attr)?;
    Ok(Self {
      code_version,
      state_version,
      db_version,
    })
  }
}

#[cfg(feature = "aws")]
impl From<BackupVersionInfo> for AttributeValue {
  fn from(value: BackupVersionInfo) -> Self {
    let code_version = value.code_version.to_string();
    let state_version = value.state_version.to_string();
    let db_version = value.db_version.to_string();

    use backup_table::attr::version_info::*;
    let map_attrs = HashMap::from([
      (CODE_VERSION.to_string(), AttributeValue::N(code_version)),
      (STATE_VERSION.to_string(), AttributeValue::N(state_version)),
      (DB_VERSION.to_string(), AttributeValue::N(db_version)),
    ]);
    AttributeValue::M(map_attrs)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_backup_item_deserialize_defaults() {
    // BackupItem is passed between services. It might happen that one service
    // has old implementation that doesn't include `total_size`
    // and `version_info` fields. When absent, deserialized object should have
    // default values for these fields set.
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
