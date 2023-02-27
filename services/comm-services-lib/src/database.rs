use aws_sdk_dynamodb::{model::AttributeValue, Error as DynamoDBError};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::num::ParseIntError;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
}

#[derive(Debug)]
pub enum Value {
  AttributeValue(Option<AttributeValue>),
  String(String),
}

#[derive(Debug, derive_more::Error, derive_more::Constructor)]
pub struct DBItemError {
  attribute_name: &'static str,
  attribute_value: Value,
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
  #[display(...)]
  InvalidNumberFormat(ParseIntError),
}

pub fn parse_string_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  match attribute_value {
    Some(AttributeValue::S(value)) => Ok(value),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    )),
  }
}

pub fn parse_bool_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<bool, DBItemError> {
  match attribute_value {
    Some(AttributeValue::Bool(value)) => Ok(value),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    )),
  }
}

pub fn parse_datetime_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  if let Some(AttributeValue::S(datetime)) = &attribute_value {
    // parse() accepts a relaxed RFC3339 string
    datetime.parse().map_err(|e| {
      DBItemError::new(
        attribute_name,
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::InvalidTimestamp(e),
      )
    })
  } else {
    Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    ))
  }
}

pub fn parse_map_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<HashMap<String, AttributeValue>, DBItemError> {
  match attribute_value {
    Some(AttributeValue::M(map)) => Ok(map),
    Some(_) => Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    )),
  }
}

pub fn parse_number(
  attribute_name: &'static str,
  attribute_value: &str,
) -> Result<i32, DBItemError> {
  attribute_value.parse::<i32>().map_err(|e| {
    DBItemError::new(
      attribute_name,
      Value::String(attribute_value.to_string()),
      DBItemAttributeError::InvalidNumberFormat(e),
    )
  })
}
