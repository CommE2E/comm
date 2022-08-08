use rand::{distributions::Alphanumeric, Rng};
use regex::Regex;

#[derive(PartialEq)]
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
  if device_type == DeviceIDType::KEYSERVER {
    return "ks:".to_string() + &suffix;
  } else if device_type == DeviceIDType::WEB {
    return "web:".to_string() + &suffix;
  } else if device_type == DeviceIDType::MOBILE {
    return "mobile:".to_string() + &suffix;
  } else {
    panic!("Unhandled DeviceIDType");
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn ks_works() {
    let result = generate_device_id(DeviceIDType::KEYSERVER);
    println!("{}", result);
    assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
      .unwrap()
      .is_match(&result));
  }

  #[test]
  fn web_works() {
    let result = generate_device_id(DeviceIDType::WEB);
    println!("{}", result);
    assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
      .unwrap()
      .is_match(&result));
  }

  #[test]
  fn moble_works() {
    let result = generate_device_id(DeviceIDType::MOBILE);
    println!("{}", result);
    assert!(Regex::new(r"^(ks|mobile|web):[a-zA-Z0-9]{64}$")
      .unwrap()
      .is_match(&result));
  }
}
