use crate::constants::{
  FEATURE_FLAGS_CONFIG_FIELD, FEATURE_FLAGS_FEATURE_FIELD,
  FEATURE_FLAGS_NON_STAFF_FIELD, FEATURE_FLAGS_STAFF_FIELD,
};
use aws_sdk_dynamodb::model::AttributeValue;
use comm_services_lib::database::{self, DBItemError};
use std::collections::HashMap;

#[derive(Debug)]
pub struct CodeVersionSpecificFeatureConfig {
  pub staff: bool,
  pub non_staff: bool,
}

fn _parse_code_version_specific_feature_config(
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

fn _parse_feature_config(
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
      _parse_code_version_specific_feature_config(Some(code_version_config))?;
    config.insert(code_version, version_config);
  }
  Ok(FeatureConfig {
    name: feature_name,
    config,
  })
}
