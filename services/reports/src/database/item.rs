use aws_sdk_dynamodb::types::AttributeValue;
use chrono::{DateTime, Utc};
use comm_lib::{
  blob::client::{BlobServiceClient, BlobServiceError},
  constants::DDB_ITEM_SIZE_LIMIT,
  crypto::aes256::EncryptionKey,
  database::{
    self, blob::BlobOrDBContent, calculate_size_in_db, AttributeExtractor,
    AttributeMap, DBItemError, TryFromAttribute,
  },
};
use num_traits::FromPrimitive;
use tracing::debug;

use super::constants::*;

use crate::report_types::*;

/// Represents a report item row in DynamoDB
/// This is serializable to display a list of reports
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportItem {
  pub id: ReportID,
  #[serde(rename = "userID")]
  pub user_id: String,
  pub report_type: ReportType,
  pub platform: ReportPlatform,
  pub creation_time: DateTime<Utc>,
  #[serde(skip_serializing)]
  pub content: BlobOrDBContent,
  #[serde(skip_serializing)]
  pub encryption_key: Option<EncryptionKey>,
}

impl ReportItem {
  pub fn into_attrs(self) -> AttributeMap {
    let creation_time = self
      .creation_time
      .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    let mut attrs = AttributeMap::from([
      (ATTR_REPORT_ID.to_string(), self.id.into()),
      (ATTR_USER_ID.to_string(), AttributeValue::S(self.user_id)),
      (ATTR_REPORT_TYPE.to_string(), self.report_type.into()),
      (ATTR_PLATFORM.to_string(), self.platform.into()),
      (
        ATTR_CREATION_TIME.to_string(),
        AttributeValue::S(creation_time),
      ),
    ]);

    let (content_attr_name, content_attr) = self
      .content
      .into_attr_pair(ATTR_BLOB_INFO, ATTR_REPORT_CONTENT);
    attrs.insert(content_attr_name, content_attr);

    if let Some(key) = self.encryption_key {
      attrs.insert(ATTR_ENCRYPTION_KEY.to_string(), key.into());
    }
    attrs
  }

  pub async fn ensure_size_constraints(
    &mut self,
    blob_client: &BlobServiceClient,
  ) -> Result<(), BlobServiceError> {
    if calculate_size_in_db(&self.clone().into_attrs()) < DDB_ITEM_SIZE_LIMIT {
      return Ok(());
    };

    debug!(
      report_id = ?self.id,
      "Report content exceeds DDB item size limit, moving to blob storage"
    );
    self.content.move_to_blob(blob_client).await
  }
}

impl TryFrom<AttributeMap> for ReportItem {
  type Error = DBItemError;

  fn try_from(mut row: AttributeMap) -> Result<Self, Self::Error> {
    let id = row.remove(ATTR_REPORT_ID).try_into()?;
    let user_id = row.take_attr(ATTR_USER_ID)?;
    let report_type = row.take_attr(ATTR_REPORT_TYPE)?;
    let platform = row.take_attr(ATTR_PLATFORM)?;
    let creation_time = row.take_attr(ATTR_CREATION_TIME)?;

    let content = BlobOrDBContent::parse_from_attrs(
      &mut row,
      ATTR_BLOB_INFO,
      ATTR_REPORT_CONTENT,
    )?;
    let encryption_key = row
      .remove(ATTR_ENCRYPTION_KEY)
      .map(|attr| EncryptionKey::try_from_attr(ATTR_ENCRYPTION_KEY, Some(attr)))
      .transpose()?;

    Ok(ReportItem {
      id,
      user_id,
      report_type,
      platform,
      content,
      encryption_key,
      creation_time,
    })
  }
}

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
  use comm_lib::database::AttributeTryInto;

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
