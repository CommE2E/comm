use rand::distributions::{Alphanumeric, DistString};
#[cfg(test)]
use regex::Regex;

enum DeviceIDType {
  KEYSERVER,
  WEB,
  MOBILE,
}

fn generate_device_id(device_type: DeviceIDType) -> String {
  let prefix = match device_type {
    DeviceIDType::KEYSERVER => "ks",
    DeviceIDType::WEB => "web",
    DeviceIDType::MOBILE => "mobile",
  };
  let mut rng = rand::thread_rng();
  let suffix: String = Alphanumeric.sample_string(&mut rng, 64);

  format!("{}:{}", &prefix, &suffix)
}

#[cfg(test)]
mod tests {
  use super::*;
  const REGEX: &str = "^(ks|mobile|web):[a-zA-Z0-9]{64}$";

  fn check_regex(str: &String) -> bool {
    Regex::new(&REGEX).unwrap().is_match(&str)
  }

  #[test]
  fn generate_device_id_ks() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::KEYSERVER);
      assert!(
        check_regex(&result),
        "result: {} does not match regex {}",
        &result,
        &REGEX
      );
    }
  }

  #[test]
  fn generate_device_id_web() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::WEB);
      assert!(
        check_regex(&result),
        "result: {} does not match regex {}",
        &result,
        &REGEX
      );
    }
  }

  #[test]
  fn generate_device_id_mobile() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::MOBILE);
      assert!(
        check_regex(&result),
        "result: {} does not match regex {}",
        &result,
        &REGEX
      );
    }
  }
}
