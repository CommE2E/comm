//! Message sent from Tunnelbroker to WebSocket clients to inform that message
//! was processed, saved in DDB, and will be delivered.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct Failure {
  pub id: String,
  pub error: String,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", content = "data")]
pub enum MessageSentStatus {
  /// The message with the provided ID (String) has been processed
  /// by the Tunnelbroker and is queued for delivery.
  Success(String),
  /// 'Failure' contains information about the message ID
  /// along with the specific error message.
  Error(Failure),
  /// The request was invalid (e.g., Bytes instead of Text).
  /// In this case, the ID cannot be retrieved.
  InvalidRequest,
  /// Unauthenticated client tried to send a message.
  Unauthenticated,
  /// The JSON could not be serialized, which is why the entire message is
  /// returned back.
  /// It becomes impossible to retrieve the message ID in such circumstances.
  SerializationError(String),
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct MessageToDeviceRequestStatus {
  #[serde(rename = "clientMessageIDs")]
  pub client_message_ids: Vec<MessageSentStatus>,
}

#[cfg(test)]
mod send_confirmation_tests {
  use super::*;

  #[test]
  fn test_send_confirmation_deserialization() {
    let example_payload = r#"{
          "type": "MessageToDeviceRequestStatus",
          "clientMessageIDs": [
            {"type": "Success", "data": "id123"},
            {"type": "Success", "data": "id456"},
            {"type": "Error", "data": {"id": "id789", "error": "Something went wrong"}},
            {"type": "SerializationError", "data": "message"},
            {"type": "InvalidRequest"}
          ]
        }"#;

    let request =
      serde_json::from_str::<MessageToDeviceRequestStatus>(example_payload)
        .unwrap();

    let expected_client_message_ids = vec![
      MessageSentStatus::Success("id123".to_string()),
      MessageSentStatus::Success("id456".to_string()),
      MessageSentStatus::Error(Failure {
        id: String::from("id789"),
        error: String::from("Something went wrong"),
      }),
      MessageSentStatus::SerializationError("message".to_string()),
      MessageSentStatus::InvalidRequest,
    ];

    assert_eq!(request.client_message_ids, expected_client_message_ids);
  }

  #[test]
  fn test_send_confirmation_deserialization_empty_vec() {
    let example_payload = r#"{
          "type": "MessageToDeviceRequestStatus",
          "clientMessageIDs": []
        }"#;

    let request =
      serde_json::from_str::<MessageToDeviceRequestStatus>(example_payload)
        .unwrap();
    let expected_client_message_ids: Vec<MessageSentStatus> = Vec::new();

    assert_eq!(request.client_message_ids, expected_client_message_ids);
  }
}
