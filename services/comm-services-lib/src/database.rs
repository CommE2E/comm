use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error as DynamoDBError;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::num::ParseIntError;
use std::str::FromStr;

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
  TimestampOutOfRange,
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

pub fn parse_int_attribute<T>(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<T, DBItemError>
where
  T: FromStr<Err = ParseIntError>,
{
  match &attribute_value {
    Some(AttributeValue::N(numeric_str)) => {
      parse_integer(attribute_name, &numeric_str)
    }
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

/// Parses the UTC timestamp in milliseconds from a DynamoDB numeric attribute
pub fn parse_timestamp_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  let timestamp =
    parse_int_attribute::<i64>(attribute_name, attribute_value.clone())?;
  let naive_datetime = chrono::NaiveDateTime::from_timestamp_millis(timestamp)
    .ok_or_else(|| {
      DBItemError::new(
        attribute_name,
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::TimestampOutOfRange,
      )
    })?;
  Ok(DateTime::from_utc(naive_datetime, Utc))
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

pub fn parse_integer<T>(
  attribute_name: &'static str,
  attribute_value: &str,
) -> Result<T, DBItemError>
where
  T: FromStr<Err = ParseIntError>,
{
  attribute_value.parse::<T>().map_err(|e| {
    DBItemError::new(
      attribute_name,
      Value::String(attribute_value.to_string()),
      DBItemAttributeError::InvalidNumberFormat(e),
    )
  })
}

#[cfg(test)]

mod tests {
  use super::*;

  #[test]
  fn test_parse_integer() {
    assert!(parse_integer::<i32>("some_attr", "123").is_ok());
    assert!(parse_integer::<i32>("negative", "-123").is_ok());

    assert!(parse_integer::<i32>("float", "3.14").is_err());
    assert!(parse_integer::<i32>("NaN", "foo").is_err());

    assert!(parse_integer::<u32>("negative_uint", "-123").is_err());
    assert!(parse_integer::<u8>("too_large", "65536").is_err());
  }

  #[test]
  fn test_parse_timestamp() {
    let timestamp = Utc::now().timestamp_millis();
    let attr = AttributeValue::N(timestamp.to_string());

    let parsed_timestamp = parse_timestamp_attribute("some_attr", Some(attr));

    assert!(parsed_timestamp.is_ok());
    assert_eq!(parsed_timestamp.unwrap().timestamp_millis(), timestamp);
  }

  #[test]
  fn test_parse_invalid_timestamp() {
    let attr = AttributeValue::N("foo".to_string());
    let parsed_timestamp = parse_timestamp_attribute("some_attr", Some(attr));
    assert!(parsed_timestamp.is_err());
  }

  #[test]
  fn test_parse_timestamp_out_of_range() {
    let attr = AttributeValue::N(i64::MAX.to_string());
    let parsed_timestamp = parse_timestamp_attribute("some_attr", Some(attr));
    assert!(parsed_timestamp.is_err());
    assert!(matches!(
      parsed_timestamp.unwrap_err().attribute_error,
      DBItemAttributeError::TimestampOutOfRange
    ));
  }
}
