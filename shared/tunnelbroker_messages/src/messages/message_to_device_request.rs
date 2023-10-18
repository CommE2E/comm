//! Message sent from Tunnelbroker to WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct MessageToDeviceRequest {
  #[serde(rename = "clientMessageID")]
  pub client_message_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub payload: String,
}

#[cfg(test)]
mod message_to_device_request_tests {
  use super::*;

  #[test]
  fn test_message_to_device_request_deserialization() {
    let example_payload = r#"{
      "type": "MessageToDeviceRequest",
      "clientMessageID": "client123",
      "deviceID": "alice",
      "payload": "message from Bob"
    }"#;

    let request =
      serde_json::from_str::<MessageToDeviceRequest>(example_payload).unwrap();
    assert_eq!(request.client_message_id, "client123");
    assert_eq!(request.device_id, "alice");
    assert_eq!(request.payload, "message from Bob");
  }
}
