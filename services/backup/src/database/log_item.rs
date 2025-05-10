use crate::constants::{log_table::attr, LOG_BACKUP_ID_SEPARATOR};
use aws_sdk_dynamodb::types::AttributeValue;
use comm_lib::{
  blob::{
    client::{BlobServiceClient, BlobServiceError},
    types::BlobInfo,
  },
  constants::DDB_ITEM_SIZE_LIMIT,
  database::{
    blob::BlobOrDBContent, calculate_size_in_db, parse_int_attribute,
    AttributeExtractor, AttributeTryInto, DBItemAttributeError, DBItemError,
    Value,
  },
};
use std::collections::HashMap;
use tracing::debug;

#[derive(Clone, Debug)]
pub struct LogItem {
  pub user_id: String,
  pub backup_id: String,
  pub log_id: usize,
  pub content: BlobOrDBContent,
  pub attachments: Vec<BlobInfo>,
}

impl LogItem {
  pub async fn ensure_size_constraints(
    &mut self,
    blob_client: &BlobServiceClient,
  ) -> Result<(), BlobServiceError> {
    if let Ok(size) = calculate_size_in_db(&self.clone().into()) {
      if size < DDB_ITEM_SIZE_LIMIT {
        return Ok(());
      };
    }

    debug!(
      log_id = ?self.log_id,
      "Log content exceeds DDB item size limit, moving to blob storage"
    );
    self.content.move_to_blob(blob_client).await
  }

  pub fn partition_key(
    user_id: impl Into<String>,
    backup_id: impl Into<String>,
  ) -> String {
    format!(
      "{}{}{}",
      user_id.into(),
      LOG_BACKUP_ID_SEPARATOR,
      backup_id.into(),
    )
  }

  pub fn revoke_holders(&self, blob_client: &BlobServiceClient) {
    if let BlobOrDBContent::Blob(content_info) = &self.content {
      blob_client
        .schedule_revoke_holder(&content_info.blob_hash, &content_info.holder);
    }

    for attachment_info in &self.attachments {
      blob_client.schedule_revoke_holder(
        &attachment_info.blob_hash,
        &attachment_info.holder,
      );
    }
  }

  pub fn item_key(
    user_id: impl Into<String>,
    backup_id: impl Into<String>,
    log_id: usize,
  ) -> HashMap<String, AttributeValue> {
    HashMap::from([
      (
        attr::BACKUP_ID.to_string(),
        AttributeValue::S(Self::partition_key(user_id, backup_id)),
      ),
      (
        attr::LOG_ID.to_string(),
        AttributeValue::N(log_id.to_string()),
      ),
    ])
  }

  /// Assigns a new backup ID for this log item. This also refreshes holders
  /// for all [`BlobInfo`]s of this log.
  pub fn reassign_backup_id_and_holders(&mut self, new_backup_id: String) {
    self.backup_id = new_backup_id;

    if let BlobOrDBContent::Blob(ref mut blob_info) = self.content {
      blob_info.holder = uuid::Uuid::new_v4().to_string();
    }
    for attachment in &mut self.attachments {
      attachment.holder = uuid::Uuid::new_v4().to_string();
    }
  }

  pub fn blob_infos(&self) -> Vec<BlobInfo> {
    let mut blobs = self.attachments.clone();
    if let BlobOrDBContent::Blob(content_blob) = &self.content {
      blobs.push(content_blob.clone());
    }
    blobs
  }
}

impl From<LogItem> for HashMap<String, AttributeValue> {
  fn from(value: LogItem) -> Self {
    let mut attrs =
      LogItem::item_key(value.user_id, value.backup_id, value.log_id);

    let (content_attr_name, content_attr) = value
      .content
      .into_attr_pair(attr::CONTENT_BLOB_INFO, attr::CONTENT_DB);
    attrs.insert(content_attr_name, content_attr);

    if !value.attachments.is_empty() {
      attrs.insert(
        attr::ATTACHMENTS.to_string(),
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

impl TryFrom<HashMap<String, AttributeValue>> for LogItem {
  type Error = DBItemError;

  fn try_from(
    mut value: HashMap<String, AttributeValue>,
  ) -> Result<Self, Self::Error> {
    let id: String = value.take_attr(attr::BACKUP_ID)?;
    let (user_id, backup_id) =
      match &id.split(LOG_BACKUP_ID_SEPARATOR).collect::<Vec<_>>()[..] {
        &[user_id, backup_id] => (user_id.to_string(), backup_id.to_string()),
        _ => {
          return Err(DBItemError::new(
            attr::BACKUP_ID.to_string(),
            Value::String(id),
            DBItemAttributeError::InvalidValue,
          ))
        }
      };
    let log_id = parse_int_attribute(attr::LOG_ID, value.remove(attr::LOG_ID))?;
    let content = BlobOrDBContent::parse_from_attrs(
      &mut value,
      attr::CONTENT_BLOB_INFO,
      attr::CONTENT_DB,
    )?;

    let attachments = value.remove(attr::ATTACHMENTS);
    let attachments = if attachments.is_some() {
      attachments.attr_try_into(attr::ATTACHMENTS)?
    } else {
      Vec::new()
    };

    Ok(LogItem {
      user_id,
      backup_id,
      log_id,
      content,
      attachments,
    })
  }
}
