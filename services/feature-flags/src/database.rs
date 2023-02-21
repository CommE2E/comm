use crate::constants::{
  FEATURE_FLAGS_CONFIG_FIELD, FEATURE_FLAGS_FEATURE_FIELD,
  FEATURE_FLAGS_NON_STAFF_FIELD, FEATURE_FLAGS_PLATFORM_FIELD,
  FEATURE_FLAGS_STAFF_FIELD, FEATURE_FLAGS_TABLE_NAME,
};
use aws_sdk_dynamodb::model::Select;
use aws_sdk_dynamodb::{model::AttributeValue, Error as DynamoDBError};
use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::num::ParseIntError;
use std::sync::Arc;
use tracing::error;

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

fn parse_string_attribute(
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

fn parse_bool_attribute(
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

fn parse_map_attribute(
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

fn parse_number(
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

fn parse_code_version_specific_feature_config(
  value: Option<AttributeValue>,
) -> Result<CodeVersionSpecificFeatureConfig, DBItemError> {
  let mut code_version_config_map =
    parse_map_attribute(FEATURE_FLAGS_CONFIG_FIELD, value)?;
  let staff = parse_bool_attribute(
    FEATURE_FLAGS_STAFF_FIELD,
    code_version_config_map.remove(FEATURE_FLAGS_STAFF_FIELD),
  )?;
  let non_staff = parse_bool_attribute(
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

fn parse_feature_config(
  mut attribute_value: HashMap<String, AttributeValue>,
) -> Result<FeatureConfig, DBItemError> {
  let feature_name = parse_string_attribute(
    FEATURE_FLAGS_FEATURE_FIELD,
    attribute_value.remove(FEATURE_FLAGS_FEATURE_FIELD),
  )?;
  let config_map = parse_map_attribute(
    FEATURE_FLAGS_CONFIG_FIELD,
    attribute_value.remove(FEATURE_FLAGS_CONFIG_FIELD),
  )?;
  let mut config = HashMap::new();
  for (code_version_string, code_version_config) in config_map {
    let code_version: i32 =
      parse_number("code_version", code_version_string.as_str())?;
    let version_config =
      parse_code_version_specific_feature_config(Some(code_version_config))?;
    config.insert(code_version, version_config);
  }
  Ok(FeatureConfig {
    name: feature_name,
    config,
  })
}

pub enum Platform {
  IOS,
  ANDROID,
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

  pub async fn get_features_configuration(
    &self,
    platform: Platform,
  ) -> Result<HashMap<String, FeatureConfig>, Error> {
    let platform_value = match platform {
      Platform::IOS => "IOS",
      Platform::ANDROID => "ANDROID",
    };
    let result = self
      .client
      .query()
      .select(Select::AllAttributes)
      .table_name(FEATURE_FLAGS_TABLE_NAME)
      .consistent_read(true)
      .key_condition_expression("#platform = :platform")
      .expression_attribute_names("#platform", FEATURE_FLAGS_PLATFORM_FIELD)
      .expression_attribute_values(
        ":platform",
        AttributeValue::S(platform_value.to_string()),
      )
      .send()
      .await
      .map_err(|e| {
        error!("DynamoDB client failed to find feature flags configuration");
        Error::AwsSdk(e.into())
      })?;
    if let Some(items) = result.items {
      let mut config = HashMap::new();
      for item in items {
        let feature_config = parse_feature_config(item)?;
        config.insert(feature_config.name.clone(), feature_config);
      }
      Ok(config)
    } else {
      Ok(HashMap::new())
    }
  }
}
