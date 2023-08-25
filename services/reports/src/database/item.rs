use aws_sdk_dynamodb::{primitives::Blob, types::AttributeValue};
use chrono::{DateTime, Utc};
use comm_services_lib::{
  blob::{
    client::{BlobServiceClient, BlobServiceError},
    types::BlobInfo,
  },
  constants::DDB_ITEM_SIZE_LIMIT,
  database::{
    self, AttributeMap, AttributeTryInto, DBItemError, TryFromAttribute,
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
  pub content: ReportContent,
  #[serde(skip_serializing)]
  pub encryption_key: Option<String>,
}

/// contains some redundancy as not all keys are always present
static REPORT_ITEM_KEYS_SIZE: usize = {
  let mut size: usize = 0;
  size += ATTR_REPORT_ID.as_bytes().len();
  size += ATTR_REPORT_TYPE.as_bytes().len();
  size += ATTR_USER_ID.as_bytes().len();
  size += ATTR_PLATFORM.as_bytes().len();
  size += ATTR_CREATION_TIME.as_bytes().len();
  size += ATTR_ENCRYPTION_KEY.as_bytes().len();
  size += ATTR_BLOB_INFO.as_bytes().len();
  size += ATTR_REPORT_CONTENT.as_bytes().len();
  size
};

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

    let (content_attr_name, content_attr) = self.content.into_attr_pair();
    attrs.insert(content_attr_name, content_attr);

    if let Some(key) = self.encryption_key {
      attrs.insert(ATTR_ENCRYPTION_KEY.to_string(), AttributeValue::S(key));
    }
    attrs
  }

  pub async fn ensure_size_constraints(
    &mut self,
    blob_client: &BlobServiceClient,
  ) -> Result<(), BlobServiceError> {
    if self.total_size() < DDB_ITEM_SIZE_LIMIT {
      return Ok(());
    };

    self.content.move_to_blob(blob_client).await
  }

  fn total_size(&self) -> usize {
    let mut size = REPORT_ITEM_KEYS_SIZE;
    size += self.id.as_bytes().len();
    size += self.user_id.as_bytes().len();
    size += self.platform.to_string().as_bytes().len();
    size += (self.report_type as u8).to_string().as_bytes().len();
    size += match &self.content {
      ReportContent::Database(data) => data.len(),
      ReportContent::Blob(info) => {
        let mut size = 0;
        size += "holder".as_bytes().len();
        size += "blob_hash".as_bytes().len();
        size += info.holder.as_bytes().len();
        size += info.blob_hash.as_bytes().len();
        size
      }
    };
    if let Some(key) = self.encryption_key.as_ref() {
      size += key.as_bytes().len();
    }
    size
  }

  /// Creates a report item from a report input payload
  ///
  /// WARN: Note that this method stores content as [`ReportStorage::Database`]
  /// regardless of its size. Use [`ensure_size_constraints`] to move content to
  /// blob storage if necessary.
  pub fn from_input(
    payload: ReportInput,
    user_id: Option<String>,
  ) -> Result<Self, serde_json::Error> {
    let ReportInput {
      platform_details,
      report_type,
      time,
      mut report_content,
    } = payload;

    let platform = platform_details.platform.clone();

    // Add "platformDetails" back to report content
    let platform_details_value = serde_json::to_value(platform_details)?;
    report_content
      .insert("platformDetails".to_string(), platform_details_value);

    // serialize report JSON to bytes
    let content_bytes = serde_json::to_vec(&report_content)?;
    let content = ReportContent::Database(content_bytes);

    Ok(ReportItem {
      id: ReportID::default(),
      user_id: user_id.unwrap_or("[null]".to_string()),
      platform,
      report_type,
      creation_time: time.unwrap_or_else(Utc::now),
      encryption_key: None,
      content,
    })
  }
}

impl TryFrom<AttributeMap> for ReportItem {
  type Error = DBItemError;

  fn try_from(mut value: AttributeMap) -> Result<Self, Self::Error> {
    let id = value.remove(ATTR_REPORT_ID).try_into()?;
    let user_id = value.remove(ATTR_USER_ID).attr_try_into(ATTR_USER_ID)?;
    let report_type = value
      .remove(ATTR_REPORT_TYPE)
      .attr_try_into(ATTR_REPORT_TYPE)?;
    let platform = value.remove(ATTR_PLATFORM).attr_try_into(ATTR_PLATFORM)?;
    let content = ReportContent::parse_from_attrs(&mut value)?;
    let creation_time = value
      .remove(ATTR_CREATION_TIME)
      .attr_try_into(ATTR_CREATION_TIME)?;

    let encryption_key = value
      .remove(ATTR_ENCRYPTION_KEY)
      .map(|attr| String::try_from_attr(ATTR_ENCRYPTION_KEY, Some(attr)))
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

/// Represents the content of a report item stored in DynamoDB
#[derive(Clone, Debug)]
pub enum ReportContent {
  Blob(BlobInfo),
  Database(Vec<u8>),
}

impl ReportContent {
  /// Returns a tuple of attribute name and value for this content
  fn into_attr_pair(self) -> (String, AttributeValue) {
    match self {
      Self::Blob(blob_info) => (ATTR_BLOB_INFO.to_string(), blob_info.into()),
      Self::Database(data) => (
        ATTR_REPORT_CONTENT.to_string(),
        AttributeValue::B(Blob::new(data)),
      ),
    }
  }
  fn parse_from_attrs(attrs: &mut AttributeMap) -> Result<Self, DBItemError> {
    if let Some(blob_info_attr) = attrs.remove(ATTR_BLOB_INFO) {
      let blob_info =
        BlobInfo::try_from_attr(ATTR_BLOB_INFO, Some(blob_info_attr))?;
      return Ok(ReportContent::Blob(blob_info));
    }

    let content_data = attrs
      .remove(ATTR_REPORT_CONTENT)
      .attr_try_into(ATTR_REPORT_CONTENT)?;
    Ok(ReportContent::Database(content_data))
  }

  /// Moves report content to blob storage:
  /// - Switches `self` from [`ReportStorage::Database`] to [`ReportStorage::Blob`]
  /// - No-op for [`ReportStorage::Blob`]
  async fn move_to_blob(
    &mut self,
    blob_client: &BlobServiceClient,
  ) -> Result<(), BlobServiceError> {
    todo!()
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
