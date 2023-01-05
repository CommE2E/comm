use aws_sdk_dynamodb::{
  model::AttributeValue, output::GetItemOutput, Error as DynamoDBError,
};
use chrono::{DateTime, Utc};
use std::{
  collections::HashMap,
  fmt::{Display, Formatter},
  sync::Arc,
};
use tracing::error;

use crate::constants::{
  BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS, BACKUP_TABLE_FIELD_BACKUP_ID,
  BACKUP_TABLE_FIELD_COMPACTION_HOLDER, BACKUP_TABLE_FIELD_CREATED,
  BACKUP_TABLE_FIELD_RECOVERY_DATA, BACKUP_TABLE_FIELD_USER_ID,
  BACKUP_TABLE_INDEX_USERID_CREATED, BACKUP_TABLE_NAME,
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

#[derive(Clone, Debug)]
pub struct LogItem {
  pub backup_id: String,
  pub log_id: String,
  pub persisted_in_blob: bool,
  pub value: String,
  pub attachment_holders: String,
  pub data_hash: String,
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
    unimplemented!()
  }

  pub async fn find_log_item(
    &self,
    backup_id: &str,
    log_id: &str,
  ) -> Result<Option<LogItem>, Error> {
    unimplemented!()
  }

  pub async fn find_log_items_for_backup(
    &self,
    backup_id: &str,
  ) -> Result<Vec<LogItem>, Error> {
    unimplemented!()
  }

  pub async fn remove_log_item(&self, log_id: &str) -> Result<(), Error> {
    unimplemented!()
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
}

#[derive(Debug, derive_more::Error, derive_more::Constructor)]
pub struct DBItemError {
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
  attribute_error: DBItemAttributeError,
}

impl Display for DBItemError {
  fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
    match &self.attribute_error {
      DBItemAttributeError::Missing => {
        write!(f, "Attribute {} is missing", self.attribute_name)
      }
      DBItemAttributeError::IncorrectType => write!(
        f,
        "Value for attribute {} has incorrect type: {:?}",
        self.attribute_name, self.attribute_value
      ),
      error => write!(
        f,
        "Error regarding attribute {} with value {:?}: {}",
        self.attribute_name, self.attribute_value, error
      ),
    }
  }
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum DBItemAttributeError {
  #[display(...)]
  Missing,
  #[display(...)]
  IncorrectType,
  #[display(...)]
  InvalidTimestamp(chrono::ParseError),
}

fn parse_string_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  match attribute_value {
    Some(AttributeValue::S(value)) => Ok(value),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_bool_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<bool, DBItemError> {
  match attribute_value {
    Some(AttributeValue::Bool(value)) => Ok(value),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::Missing,
    )),
  }
}

fn parse_datetime_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  if let Some(AttributeValue::S(datetime)) = &attribute_value {
    // parse() accepts a relaxed RFC3339 string
    datetime.parse().map_err(|e| {
      DBItemError::new(
        attribute_name,
        attribute_value,
        DBItemAttributeError::InvalidTimestamp(e),
      )
    })
  } else {
    Err(DBItemError::new(
      attribute_name,
      attribute_value,
      DBItemAttributeError::Missing,
    ))
  }
}

fn parse_backup_item(
  mut item: HashMap<String, AttributeValue>,
) -> Result<BackupItem, DBItemError> {
  let user_id = parse_string_attribute(
    BACKUP_TABLE_FIELD_USER_ID,
    item.remove(BACKUP_TABLE_FIELD_USER_ID),
  )?;
  let backup_id = parse_string_attribute(
    BACKUP_TABLE_FIELD_BACKUP_ID,
    item.remove(BACKUP_TABLE_FIELD_BACKUP_ID),
  )?;
  let created = parse_datetime_attribute(
    BACKUP_TABLE_FIELD_CREATED,
    item.remove(BACKUP_TABLE_FIELD_CREATED),
  )?;
  let recovery_data = parse_string_attribute(
    BACKUP_TABLE_FIELD_RECOVERY_DATA,
    item.remove(BACKUP_TABLE_FIELD_RECOVERY_DATA),
  )?;
  let compaction_holder = parse_string_attribute(
    BACKUP_TABLE_FIELD_COMPACTION_HOLDER,
    item.remove(BACKUP_TABLE_FIELD_COMPACTION_HOLDER),
  )?;
  let attachment_holders = parse_string_attribute(
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
