use rand::{distributions::Alphanumeric, Rng};
#[cfg(test)]
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
  fn generate_device_id_ks() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::KEYSERVER);
      println!("{}", result);
      assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
        .unwrap()
        .is_match(&result));
    }
  }

  #[test]
  fn generate_device_id_web() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::WEB);
      println!("{}", result);
      assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
        .unwrap()
        .is_match(&result));
    }
  }

  #[test]
  fn generate_device_id_moble() {
    for _x in 1..100 {
      let result = generate_device_id(DeviceIDType::MOBILE);
      println!("{}", result);
      assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
        .unwrap()
        .is_match(&result));
    }
  }
}
