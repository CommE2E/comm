use aws_sdk_dynamodb::{model::AttributeValue, Error as DynamoDBError};
use std::fmt::{Display, Formatter, Result as FmtResult};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
  #[display(...)]
  MissingItem,
}

#[derive(Debug, derive_more::Error, derive_more::Constructor)]
pub struct DBItemError {
  pub attribute_name: String,
  pub attribute_value: Option<AttributeValue>,
  pub attribute_error: DBItemAttributeError,
}

impl Display for DBItemError {
  fn fmt(&self, f: &mut Formatter) -> FmtResult {
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
  #[display(...)]
  InvalidValue,
}
