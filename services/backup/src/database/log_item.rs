use crate::constants::log_table::attr;
use aws_sdk_dynamodb::types::AttributeValue;
use comm_lib::{
  blob::{
    client::{BlobServiceClient, BlobServiceError},
    types::BlobInfo,
  },
  constants::DDB_ITEM_SIZE_LIMIT,
  database::{
    blob::BlobOrDBContent, calculate_size_in_db, parse_int_attribute,
    AttributeExtractor, AttributeTryInto, DBItemError,
  },
};
use std::collections::HashMap;
use tracing::debug;

#[derive(Clone, Debug)]
pub struct LogItem {
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

  pub fn item_key(
    backup_id: impl Into<String>,
    log_id: usize,
  ) -> HashMap<String, AttributeValue> {
    HashMap::from([
      (
        attr::BACKUP_ID.to_string(),
        AttributeValue::S(backup_id.into()),
      ),
      (
        attr::LOG_ID.to_string(),
        AttributeValue::N(log_id.to_string()),
      ),
    ])
  }
}

impl From<LogItem> for HashMap<String, AttributeValue> {
  fn from(value: LogItem) -> Self {
    let mut attrs = LogItem::item_key(value.backup_id, value.log_id);

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
    let backup_id = value.take_attr(attr::BACKUP_ID)?;
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
      backup_id,
      log_id,
      content,
      attachments,
    })
  }
}
