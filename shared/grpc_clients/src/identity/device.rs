use std::fmt::{Display, Formatter, Result as FmtResult};

use crate::error::Error;
pub use crate::identity::protos::client::DeviceType;

impl TryFrom<i32> for DeviceType {
  type Error = crate::error::Error;

  fn try_from(value: i32) -> Result<Self, Self::Error> {
    match value {
      0 => Ok(DeviceType::Keyserver),
      1 => Ok(DeviceType::Web),
      2 => Ok(DeviceType::Ios),
      3 => Ok(DeviceType::Android),
      4 => Ok(DeviceType::Windows),
      5 => Ok(DeviceType::MacOs),
      _ => Err(Error::InvalidDeviceType),
    }
  }
}

impl Display for DeviceType {
  fn fmt(&self, f: &mut Formatter) -> FmtResult {
    match self {
      DeviceType::Keyserver => write!(f, "keyserver"),
      DeviceType::Web => write!(f, "web"),
      DeviceType::Ios => write!(f, "ios"),
      DeviceType::Android => write!(f, "android"),
      DeviceType::Windows => write!(f, "windows"),
      DeviceType::MacOs => write!(f, "macos"),
    }
  }
}

#[cfg(test)]
mod device_tests {
  use super::*;

  #[test]
  fn test_device_try_from() {
    let device_type = DeviceType::try_from(5i32).unwrap();

    assert_eq!(DeviceType::MacOs, device_type);
  }

  #[test]
  fn test_invalid_device() {
    let device_type_result = DeviceType::try_from(6i32);

    assert!(device_type_result.is_err());
  }

  #[test]
  fn test_display_device_type() {
    assert_eq!(format!("{}", DeviceType::Ios), "ios");
  }
}
