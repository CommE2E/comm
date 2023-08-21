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
  attribute_name: String,
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

/// Conversion trait for [`AttributeValue`]
///
/// Types implementing this trait are able to do the following:
/// ```
/// use comm_services_lib::database::{TryFromAttribute, AttributeTryInto};
/// # let attribute = aws_sdk_dynamodb::types::AttributeValue::S("a".to_string());
/// let foo = String::try_from_attr("MyAttribute", Some(attribute)).unwrap();
///
/// // if `AttributeTryInto` is imported, also:
/// # let attribute = aws_sdk_dynamodb::types::AttributeValue::S("a".to_string());
/// let bar: String = Some(attribute).attr_try_into("MyAttribute").unwrap();
pub trait TryFromAttribute: Sized {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError>;
}

/// Do NOT implement this trait directly. Implement [`TryFromAttribute`] instead
pub trait AttributeTryInto<T> {
  fn attr_try_into(
    self,
    attribute_name: impl Into<String>,
  ) -> Result<T, DBItemError>;
}
// Automatic attr_try_into() for all attribute values
// that have TryFromAttribute implemented
impl<T: TryFromAttribute> AttributeTryInto<T> for Option<AttributeValue> {
  fn attr_try_into(
    self,
    attribute_name: impl Into<String>,
  ) -> Result<T, DBItemError> {
    T::try_from_attr(attribute_name, self)
  }
}

impl TryFromAttribute for String {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::S(value)) => Ok(value),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for bool {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::Bool(value)) => Ok(value),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for DateTime<Utc> {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match &attribute {
      Some(AttributeValue::S(datetime)) => datetime.parse().map_err(|e| {
        DBItemError::new(
          attribute_name.into(),
          Value::AttributeValue(attribute),
          DBItemAttributeError::InvalidTimestamp(e),
        )
      }),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for HashMap<String, AttributeValue> {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::M(map)) => Ok(map),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

impl TryFromAttribute for Vec<u8> {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute_value: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    match attribute_value {
      Some(AttributeValue::B(data)) => Ok(data.into_inner()),
      Some(_) => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::IncorrectType,
      )),
      None => Err(DBItemError::new(
        attribute_name.into(),
        Value::AttributeValue(attribute_value),
        DBItemAttributeError::Missing,
      )),
    }
  }
}

#[deprecated = "Use `String::try_from_attr()` instead"]
pub fn parse_string_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<String, DBItemError> {
  String::try_from_attr(attribute_name, attribute_value)
}

#[deprecated = "Use `bool::try_from_attr()` instead"]
pub fn parse_bool_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<bool, DBItemError> {
  bool::try_from_attr(attribute_name, attribute_value)
}

#[deprecated = "Use `DateTime::<Utc>::try_from_attr()` instead"]
pub fn parse_datetime_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  DateTime::<Utc>::try_from_attr(attribute_name, attribute_value)
}

#[deprecated = "Use `HashMap::<String, AttributeValue>::try_from_attr()` instead"]
pub fn parse_map_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<HashMap<String, AttributeValue>, DBItemError> {
  attribute_value.attr_try_into(attribute_name)
}

pub fn parse_int_attribute<T>(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<T, DBItemError>
where
  T: FromStr<Err = ParseIntError>,
{
  match &attribute_value {
    Some(AttributeValue::N(numeric_str)) => {
      parse_integer(attribute_name, numeric_str)
    }
    Some(_) => Err(DBItemError::new(
      attribute_name.into(),
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::IncorrectType,
    )),
    None => Err(DBItemError::new(
      attribute_name.into(),
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    )),
  }
}

/// Parses the UTC timestamp in milliseconds from a DynamoDB numeric attribute
pub fn parse_timestamp_attribute(
  attribute_name: impl Into<String>,
  attribute_value: Option<AttributeValue>,
) -> Result<DateTime<Utc>, DBItemError> {
  let attribute_name: String = attribute_name.into();
  let timestamp = parse_int_attribute::<i64>(
    attribute_name.clone(),
    attribute_value.clone(),
  )?;
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

pub fn parse_integer<T>(
  attribute_name: impl Into<String>,
  attribute_value: &str,
) -> Result<T, DBItemError>
where
  T: FromStr<Err = ParseIntError>,
{
  attribute_value.parse::<T>().map_err(|e| {
    DBItemError::new(
      attribute_name.into(),
      Value::String(attribute_value.into()),
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
