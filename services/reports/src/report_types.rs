// Report ID

use std::collections::HashMap;

use chrono::{serde::ts_milliseconds_option, DateTime, Utc};
use derive_more::{Deref, Display, Into};
use num_derive::FromPrimitive;
use serde::{de::Error, Deserialize, Serialize};
use serde_repr::Deserialize_repr;

#[derive(Clone, Debug, Deref, Serialize, Into)]
#[repr(transparent)]
pub struct ReportID(String);
impl Default for ReportID {
  fn default() -> Self {
    let uuid = uuid::Uuid::new_v4();
    ReportID(uuid.to_string())
  }
}
impl From<String> for ReportID {
  fn from(value: String) -> Self {
    ReportID(value)
  }
}

/// Serialized / deserialized report type.
/// We receive report type from clients as a number,
/// but want to display it as a string.
#[derive(
  Copy, Clone, Debug, Default, FromPrimitive, Serialize, Deserialize_repr,
)]
#[repr(u8)]
#[serde(rename_all(serialize = "snake_case"))]
pub enum ReportType {
  // NOTE: Keep these in sync with `reportTypes` in lib/types/report-types.js
  #[default]
  ErrorReport = 0,
  ThreadInconsistency = 1,
  EntryInconsistency = 2,
  MediaMission = 3,
  UserInconsistency = 4,
}

/// Report platform
#[derive(Clone, Debug, Serialize, Deserialize, Display)]
#[serde(rename_all = "lowercase")]
pub enum ReportPlatform {
  Android,
  IOS,
  Web,
  Windows,
  MacOS,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformDetails {
  pub platform: ReportPlatform,
  code_version: Option<u16>,
  state_version: Option<u16>,
}

/// Input report payload - this is the JSON we receive from clients
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(remote = "Self")] // we delegate to our custom validation trait
pub struct ReportInput {
  pub platform_details: PlatformDetails,

  #[serde(rename = "type")]
  #[serde(default)]
  pub report_type: ReportType,

  #[serde(default)]
  #[serde(with = "ts_milliseconds_option")]
  pub time: Option<DateTime<Utc>>,

  // we usually don't care about the rest of the fields
  // so we just keep them as a JSON object
  #[serde(flatten)]
  pub report_content: HashMap<String, serde_json::Value>,
}

// We can do additional validation here
impl<'de> serde::de::Deserialize<'de> for ReportInput {
  fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
  where
    D: serde::Deserializer<'de>,
  {
    let mut this = Self::deserialize(deserializer)?;
    if this.time.is_none() {
      if !matches!(this.report_type, ReportType::ThreadInconsistency) {
        return Err(Error::custom(
          "The 'time' field is optional only for thread inconsistency reports",
        ));
      }
      this.time = Some(Utc::now());
    }
    Ok(this)
  }
}

/// Report output payload - this is used to view the report
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportOutput {
  pub id: ReportID,
  #[serde(rename = "userID")]
  pub user_id: String,
  pub platform: ReportPlatform,
  pub report_type: ReportType,
  pub creation_time: DateTime<Utc>,
  pub content: HashMap<String, serde_json::Value>,
}
