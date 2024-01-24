//! Messages sent between Tunnelbroker and devices.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type")]
pub struct Heartbeat {}

#[cfg(test)]
mod heartbeat_tests {
  use super::*;

  #[test]
  fn test_heartbeat_deserialization() {
    let example_payload = r#"{
      "type": "Heartbeat"
    }"#;

    let request = serde_json::from_str::<Heartbeat>(example_payload).unwrap();
    let expected = Heartbeat {};
    assert_eq!(request, expected);
  }
}
