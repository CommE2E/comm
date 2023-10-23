//! Messages sent between Tunnelbroker and a device via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct MessageToDevice {
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub payload: String,
  #[serde(rename = "messageID")]
  pub message_id: String,
}

#[cfg(test)]
mod message_to_device_tests {
  use super::*;

  #[test]
  fn test_message_to_device_deserialization() {
    let example_payload = r#"{
      "type": "MessageToDevice",
      "deviceID": "alice",
      "payload": "message from Bob",
      "messageID": "id234"
    }"#;

    let request =
      serde_json::from_str::<MessageToDevice>(example_payload).unwrap();
    assert_eq!(request.device_id, "alice");
    assert_eq!(request.payload, "message from Bob");
    assert_eq!(request.message_id, "id234");
  }
}
