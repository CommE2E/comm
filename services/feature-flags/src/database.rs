use crate::constants::{
  FEATURE_FLAGS_CONFIG_FIELD, FEATURE_FLAGS_FEATURE_FIELD,
  FEATURE_FLAGS_NON_STAFF_FIELD, FEATURE_FLAGS_PLATFORM_FIELD,
  FEATURE_FLAGS_STAFF_FIELD, FEATURE_FLAGS_TABLE_NAME, PLATFORM_ANDROID,
  PLATFORM_IOS,
};
use aws_sdk_dynamodb::model::{AttributeValue, Select};
use rust_lib::database::{self, DBItemError, Error};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::error;

#[derive(Debug)]
pub struct CodeVersionSpecificFeatureConfig {
  pub staff: bool,
  pub non_staff: bool,
}

fn parse_code_version_specific_feature_config(
  value: Option<AttributeValue>,
) -> Result<CodeVersionSpecificFeatureConfig, DBItemError> {
  let mut code_version_config_map =
    database::parse_map_attribute(FEATURE_FLAGS_CONFIG_FIELD, value)?;
  let staff = database::parse_bool_attribute(
    FEATURE_FLAGS_STAFF_FIELD,
    code_version_config_map.remove(FEATURE_FLAGS_STAFF_FIELD),
  )?;
  let non_staff = database::parse_bool_attribute(
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
  let feature_name = database::parse_string_attribute(
    FEATURE_FLAGS_FEATURE_FIELD,
    attribute_value.remove(FEATURE_FLAGS_FEATURE_FIELD),
  )?;
  let config_map = database::parse_map_attribute(
    FEATURE_FLAGS_CONFIG_FIELD,
    attribute_value.remove(FEATURE_FLAGS_CONFIG_FIELD),
  )?;
  let mut config = HashMap::new();
  for (code_version_string, code_version_config) in config_map {
    let code_version: i32 =
      database::parse_number("code_version", code_version_string.as_str())?;
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
      Platform::IOS => PLATFORM_IOS,
      Platform::ANDROID => PLATFORM_ANDROID,
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
