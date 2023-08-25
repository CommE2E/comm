use aws_sdk_dynamodb::types::AttributeValue;
use comm_services_lib::database::{self, DBItemError, TryFromAttribute};
use num_traits::FromPrimitive;
use tracing::debug;

use super::constants::*;

use crate::report_types::*;

// DB conversions for report types

// ReportID
impl From<ReportID> for AttributeValue {
  fn from(value: ReportID) -> Self {
    AttributeValue::S(value.into())
  }
}
impl From<&ReportID> for AttributeValue {
  fn from(value: &ReportID) -> Self {
    AttributeValue::S(value.clone().into())
  }
}
impl TryFrom<Option<AttributeValue>> for ReportID {
  type Error = database::DBItemError;

  fn try_from(value: Option<AttributeValue>) -> Result<Self, Self::Error> {
    let raw = String::try_from_attr(ATTR_REPORT_ID, value)?;
    Ok(ReportID::from(raw))
  }
}

// ReportType
impl From<ReportType> for AttributeValue {
  fn from(value: ReportType) -> Self {
    let num = value as u8;
    AttributeValue::N(num.to_string())
  }
}
impl TryFromAttribute for ReportType {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, database::DBItemError> {
    let attr_name = attribute_name.into();
    let num: u8 = database::parse_int_attribute(&attr_name, attribute)?;
    <ReportType as FromPrimitive>::from_u8(num).ok_or_else(|| {
      database::DBItemError::new(
        attr_name,
        database::Value::String(num.to_string()),
        database::DBItemAttributeError::IncorrectType,
      )
    })
  }
}

// ReportPlatform
impl From<ReportPlatform> for AttributeValue {
  fn from(value: ReportPlatform) -> Self {
    let raw = value.to_string().to_lowercase();
    AttributeValue::S(raw)
  }
}
impl TryFromAttribute for ReportPlatform {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    let attr_name = attribute_name.into();
    let raw = String::try_from_attr(&attr_name, attribute)?;
    // serde_json understands only quoted strings
    let quoted = format!("\"{raw}\"");
    serde_json::from_str(&quoted).map_err(|err| {
      debug!("Failed to deserialize ReportPlatform: {}", err);
      DBItemError::new(
        attr_name,
        database::Value::String(raw),
        database::DBItemAttributeError::IncorrectType,
      )
    })
  }
}

#[cfg(test)]
mod tests {
  use comm_services_lib::database::AttributeTryInto;

  use super::*;

  #[test]
  fn test_platform_conversions() -> anyhow::Result<()> {
    let platform = ReportPlatform::MacOS;

    let attribute: AttributeValue = platform.into();

    assert_eq!(attribute, AttributeValue::S("macos".to_string()));

    let converted_back: ReportPlatform =
      Some(attribute).attr_try_into("foo")?;

    assert!(matches!(converted_back, ReportPlatform::MacOS));

    Ok(())
  }

  #[test]
  fn test_type_conversions() -> anyhow::Result<()> {
    let report_type = ReportType::MediaMission;
    let numeric_type = (report_type as u8).to_string();
    let attr: AttributeValue = report_type.into();
    assert_eq!(attr, AttributeValue::N(numeric_type.to_string()));

    let converted_back: ReportType = Some(attr).attr_try_into("foo")?;
    assert!(matches!(converted_back, ReportType::MediaMission));
    Ok(())
  }
}
