use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter, Result as FmtResult};
use std::str::FromStr;

/// Message sent by device to set device token.
#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct SetDeviceToken {
  pub device_token: String,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
  Android,
  IOS,
  Web,
  Windows,
  MacOS,
}

impl Display for Platform {
  fn fmt(&self, f: &mut Formatter) -> FmtResult {
    match self {
      Platform::Web => write!(f, "web"),
      Platform::IOS => write!(f, "ios"),
      Platform::Android => write!(f, "android"),
      Platform::Windows => write!(f, "windows"),
      Platform::MacOS => write!(f, "macos"),
    }
  }
}

impl FromStr for Platform {
  type Err = serde_json::Error;
  fn from_str(value: &str) -> Result<Self, Self::Err> {
    let quoted = format!("\"{}\"", value);
    serde_json::from_str(&quoted)
  }
}

/// Message sent by device to set device with platform.
#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct SetDeviceTokenWithPlatform {
  pub device_token: String,
  pub platform: Platform,
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_deserialization() {
    let device_token = "some_device_token";
    let example_payload = r#"{
        "type": "SetDeviceTokenWithPlatform",
        "deviceToken": "some_device_token",
        "platform": "macos"
    }"#;

    let deserialized: SetDeviceTokenWithPlatform =
      serde_json::from_str(example_payload).unwrap();

    assert_eq!(deserialized.device_token, device_token);
    assert_eq!(deserialized.platform, Platform::MacOS);
  }

  #[test]
  fn test_try_from_for_platform() {
    assert_eq!(Platform::from_str("web").unwrap(), Platform::Web);
    assert_eq!(Platform::from_str("ios").unwrap(), Platform::IOS);
    assert_eq!(Platform::from_str("android").unwrap(), Platform::Android);
    assert_eq!(Platform::from_str("windows").unwrap(), Platform::Windows);
    assert_eq!(Platform::from_str("macos").unwrap(), Platform::MacOS);
  }

  #[test]
  fn test_display_for_platform() {
    assert_eq!(format!("{}", Platform::Web), "web");
    assert_eq!(format!("{}", Platform::IOS), "ios");
    assert_eq!(format!("{}", Platform::Android), "android");
    assert_eq!(format!("{}", Platform::Windows), "windows");
    assert_eq!(format!("{}", Platform::MacOS), "macos");
  }
}
