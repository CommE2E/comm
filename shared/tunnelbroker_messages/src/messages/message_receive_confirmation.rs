//! Message sent from WebSocket client to Tunnelbroker to inform that message
//! was processed, and can be deleted from DDB.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type")]
pub struct MessageReceiveConfirmation {
  #[serde(rename = "messageIDs")]
  pub message_ids: Vec<String>,
}

#[cfg(test)]
mod receive_confirmation_tests {
  use super::*;

  #[test]
  fn test_receive_confirmation_deserialization() {
    let example_payload = r#"{
          "type": "MessageToDeviceRequestStatus",
          "messageIDs": ["id123", "id456"]
        }"#;

    let request =
      serde_json::from_str::<MessageReceiveConfirmation>(example_payload)
        .unwrap();

    let expected_ids = vec!["id123".to_string(), "id456".to_string()];

    assert_eq!(request.message_ids, expected_ids);
  }
}
