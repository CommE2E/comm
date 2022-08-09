use rand::{distributions::Alphanumeric, Rng};
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
  let suffix: String = rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(64)
    .map(char::from)
    .collect();

  format!("{}:{}", &prefix, &suffix)
}

#[cfg(test)]
mod tests {
  use super::*;

  fn check_regex(str: &String) -> bool {
    Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
      .unwrap()
      .is_match(&str)
  }

  #[test]
  fn generate_device_id_ks() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::KEYSERVER);
      assert!(check_regex(&result), "result: {}", &result);
    }
  }

  #[test]
  fn generate_device_id_web() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::WEB);
      assert!(check_regex(&result), "result: {}", &result);
    }
  }

  #[test]
  fn generate_device_id_moble() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::MOBILE);
      assert!(check_regex(&result), "result: {}", &result);
    }
  }
}
