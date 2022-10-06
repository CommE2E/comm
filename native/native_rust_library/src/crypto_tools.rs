use crate::ffi::DeviceType;
use rand::distributions::{Alphanumeric, DistString};
#[cfg(test)]
use regex::Regex;
use tracing::error;

// DEVICE_ID_CHAR_LENGTH has to be kept in sync with deviceIDCharLength
// which is defined in web/utils/device-id.js
// and with DEVICE_CHAR_LENGTH
// defined in services/tunnelbroker/src/Constants.h
const DEVICE_ID_CHAR_LENGTH: usize = 64;
// DEVICE_ID_FORMAT_REGEX has to be kept in sync with deviceIDFormatRegex
// which is defined in web/utils/device-id.js
// and with DEVICEID_FORMAT_REGEX
// defined in services/tunnelbroker/src/Constants.h
#[cfg(test)]
const DEVICE_ID_FORMAT_REGEX: &str = "^(ks|mobile|web):[a-zA-Z0-9]{64}$";

// generate_device_id has to be kept in sync with generateDeviceID
// which is defined in web/utils/device-id.js
pub fn generate_device_id(device_type: DeviceType) -> Result<String, String> {
  let prefix = match device_type {
    DeviceType::KEYSERVER => "ks",
    DeviceType::WEB => "web",
    DeviceType::MOBILE => "mobile",
    _ => {
      error!("Incorrect device type provieded");
      return Err(String::from("Incorrect device type provieded"));
    }
  };
  let mut rng = rand::thread_rng();
  let suffix: String =
    Alphanumeric.sample_string(&mut rng, DEVICE_ID_CHAR_LENGTH);

  Ok(format!("{}:{}", &prefix, &suffix))
}

#[cfg(test)]
mod tests {
  use super::*;

  fn check_regex(str: &String) -> bool {
    Regex::new(&DEVICE_ID_FORMAT_REGEX).unwrap().is_match(&str)
  }

  #[test]
  fn generate_device_id_ks() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceType::KEYSERVER).unwrap();
      assert!(
        check_regex(&result),
        "result: {} does not match regex {}",
        &result,
        &DEVICE_ID_FORMAT_REGEX
      );
    }
  }

  #[test]
  fn generate_device_id_web() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceType::WEB).unwrap();
      assert!(
        check_regex(&result),
        "result: {} does not match regex {}",
        &result,
        &DEVICE_ID_FORMAT_REGEX
      );
    }
  }

  #[test]
  fn generate_device_id_mobile() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceType::MOBILE).unwrap();
      assert!(
        check_regex(&result),
        "result: {} does not match regex {}",
        &result,
        &DEVICE_ID_FORMAT_REGEX
      );
    }
  }
}
