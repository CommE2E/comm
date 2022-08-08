use rand::{distributions::Alphanumeric, Rng};
use regex::Regex;

enum DeviceIDType {
  KEYSERVER,
  WEB,
  MOBILE,
}

fn generate_device_id(device_type: DeviceIDType) -> String {
  let suffix: String = rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(64)
    .map(char::from)
    .collect();
  match device_type {
    DeviceIDType::KEYSERVER => format!("ks:{}", &suffix),
    DeviceIDType::WEB => format!("web:{}", &suffix),
    DeviceIDType::MOBILE => format!("mobile:{}", &suffix),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn ks_works() {
    for x in 1..100 {
      let result = generate_device_id(DeviceIDType::KEYSERVER);
      println!("{}", result);
      assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
        .unwrap()
        .is_match(&result));
    }
  }

  #[test]
  fn web_works() {
    for x in 1..100 {
      let result = generate_device_id(DeviceIDType::WEB);
      println!("{}", result);
      assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
        .unwrap()
        .is_match(&result));
    }
  }

  #[test]
  fn moble_works() {
    for x in 1..100 {
      let result = generate_device_id(DeviceIDType::MOBILE);
      println!("{}", result);
      assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
        .unwrap()
        .is_match(&result));
    }
  }
}
