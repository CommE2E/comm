use crate::constants::{
  FEATURE_FLAGS_CONFIG_FIELD, FEATURE_FLAGS_FEATURE_FIELD,
  FEATURE_FLAGS_NON_STAFF_FIELD, FEATURE_FLAGS_STAFF_FIELD,
};
use aws_sdk_dynamodb::{model::AttributeValue, Error as DynamoDBError};
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
  InvalidNumberFormat(ParseIntError),
}

fn _parse_string_attribute(
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

fn _parse_bool_attribute(
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

fn _parse_map_attribute(
  attribute_name: &'static str,
  attribute_value: Option<AttributeValue>,
) -> Result<HashMap<String, AttributeValue>, DBItemError> {
  if let Some(AttributeValue::M(map)) = attribute_value {
    Ok(map)
  } else {
    Err(DBItemError::new(
      attribute_name,
      Value::AttributeValue(attribute_value),
      DBItemAttributeError::Missing,
    ))
  }
}

fn _parse_number(
  attribute_name: &'static str,
  attribute_value: &str,
) -> Result<i32, DBItemError> {
  let result = attribute_value.parse::<i32>().map_err(|e| {
    DBItemError::new(
      attribute_name,
      Value::String(attribute_value.to_string()),
      DBItemAttributeError::InvalidNumberFormat(e),
    )
  })?;
  Ok(result)
}

#[derive(Debug)]
pub struct CodeVersionSpecificFeatureConfig {
  pub staff: bool,
  pub non_staff: bool,
}

fn _parse_code_version_specific_feature_config(
  value: Option<AttributeValue>,
) -> Result<CodeVersionSpecificFeatureConfig, DBItemError> {
  let mut code_version_config_map =
    _parse_map_attribute(FEATURE_FLAGS_CONFIG_FIELD, value)?;
  let staff = _parse_bool_attribute(
    FEATURE_FLAGS_STAFF_FIELD,
    code_version_config_map.remove(FEATURE_FLAGS_STAFF_FIELD),
  )?;
  let non_staff = _parse_bool_attribute(
    FEATURE_FLAGS_NON_STAFF_FIELD,
    code_version_config_map.remove(FEATURE_FLAGS_NON_STAFF_FIELD),
  )?;
  Ok(CodeVersionSpecificFeatureConfig { staff, non_staff })
}

#[derive(Debug)]
pub struct FeatureConfig {
  pub name: String,
  pub config: HashMap<i32, CodeVersionSpecificFeatureConfig>,
}

fn _parse_feature_config(
  mut attribute_value: HashMap<String, AttributeValue>,
) -> Result<FeatureConfig, DBItemError> {
  let feature_name = _parse_string_attribute(
    FEATURE_FLAGS_FEATURE_FIELD,
    attribute_value.remove(FEATURE_FLAGS_FEATURE_FIELD),
  )?;
  let config_map = _parse_map_attribute(
    FEATURE_FLAGS_CONFIG_FIELD,
    attribute_value.remove(FEATURE_FLAGS_CONFIG_FIELD),
  )?;
  let mut config = HashMap::new();
  for (code_version_string, code_version_config) in config_map {
    let code_version: i32 =
      _parse_number("code_version", code_version_string.as_str())?;
    let version_config =
      _parse_code_version_specific_feature_config(Some(code_version_config))?;
    config.insert(code_version, version_config);
  }
  Ok(FeatureConfig {
    name: feature_name,
    config,
  })
}
