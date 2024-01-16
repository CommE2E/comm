use comm_lib::aws::ddb::types::AttributeValue;
use comm_lib::aws::DynamoDBError;
use comm_lib::database::{DBItemAttributeError, DBItemError, Value};
use std::collections::hash_map::HashMap;
use tracing::error;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
  #[display(...)]
  Transport(tonic::transport::Error),
  #[display(...)]
  Status(tonic::Status),
  #[display(...)]
  MissingItem,
  #[display(...)]
  DeviceList(DeviceListError),
  #[display(...)]
  MalformedItem,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub enum DeviceListError {
  DeviceAlreadyExists,
  DeviceNotFound,
  ConcurrentUpdateError,
}

#[deprecated(note = "Use comm-lib traits instead")]
pub trait FromAttributeValue {
  fn to_vec(
    &self,
    attr_name: &str,
  ) -> Result<&Vec<AttributeValue>, DBItemError>;
  fn to_string(&self, attr_name: &str) -> Result<&String, DBItemError>;
  fn to_hashmap(
    &self,
    attr_name: &str,
  ) -> Result<&HashMap<String, AttributeValue>, DBItemError>;
}

fn handle_attr_failure(value: &AttributeValue, attr_name: &str) -> DBItemError {
  DBItemError {
    attribute_name: attr_name.to_string(),
    attribute_value: Value::AttributeValue(Some(value.clone())),
    attribute_error: DBItemAttributeError::IncorrectType,
  }
}

impl FromAttributeValue for AttributeValue {
  fn to_vec(
    &self,
    attr_name: &str,
  ) -> Result<&Vec<AttributeValue>, DBItemError> {
    self.as_l().map_err(|e| handle_attr_failure(e, attr_name))
  }

  fn to_string(&self, attr_name: &str) -> Result<&String, DBItemError> {
    self.as_s().map_err(|e| handle_attr_failure(e, attr_name))
  }

  fn to_hashmap(
    &self,
    attr_name: &str,
  ) -> Result<&HashMap<String, AttributeValue>, DBItemError> {
    self.as_m().map_err(|e| handle_attr_failure(e, attr_name))
  }
}

pub trait AttributeValueFromHashMap {
  fn get_string(&self, key: &str) -> Result<&String, DBItemError>;
  fn get_map(
    &self,
    key: &str,
  ) -> Result<&HashMap<String, AttributeValue>, DBItemError>;
  fn get_vec(&self, key: &str) -> Result<&Vec<AttributeValue>, DBItemError>;
}

impl AttributeValueFromHashMap for HashMap<String, AttributeValue> {
  fn get_string(&self, key: &str) -> Result<&String, DBItemError> {
    self
      .get(key)
      .ok_or(DBItemError {
        attribute_name: key.to_string(),
        attribute_value: None.into(),
        attribute_error: DBItemAttributeError::Missing,
      })?
      .to_string(key)
  }

  fn get_map(
    &self,
    key: &str,
  ) -> Result<&HashMap<String, AttributeValue>, DBItemError> {
    self
      .get(key)
      .ok_or(DBItemError {
        attribute_name: key.to_string(),
        attribute_value: None.into(),
        attribute_error: DBItemAttributeError::Missing,
      })?
      .to_hashmap(key)
  }

  fn get_vec(&self, key: &str) -> Result<&Vec<AttributeValue>, DBItemError> {
    self
      .get(key)
      .ok_or(DBItemError {
        attribute_name: key.to_string(),
        attribute_value: None.into(),
        attribute_error: DBItemAttributeError::Missing,
      })?
      .to_vec(key)
  }
}

pub fn consume_error<T>(result: Result<T, Error>) {
  match result {
    Ok(_) => (),
    Err(e) => {
      error!("{}", e);
    }
  }
}
