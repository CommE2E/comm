// Message sent from Tunnelbroker to WebSocket clients to inform that message
// was processed, saved in DDB and will be delivered.

use serde::{Deserialize, Serialize};

/// Message statuses:
///   - Success(ID): message with ID was processed by Tunnelbroker
///     and will be delivered.
///   - Error(Failure): Failure contains information about message ID
///     and the exact error message.
///   - InvalidRequest: request was invalid (eg. Bytes instead of Text),
///     ID cannot be retrieved.
///   - SerializationError(Message): JSON can not serialized, returning back
///     entire message because it is not possible to retrieve the message ID.

#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct Failure {
  pub id: String,
  pub error: String,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", content = "data")]
pub enum MessageSentStatus {
  Success(String),
  Error(Failure),
  InvalidRequest,
  SerializationError(String),
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct SendConfirmation {
  #[serde(rename = "clientMessageIDs")]
  pub client_message_ids: Vec<MessageSentStatus>,
}

#[cfg(test)]
mod send_confirmation_tests {
  use super::*;

  #[test]
  fn test_send_confirmation_deserialization() {
    let example_payload = r#"{
          "type": "SendRequest",
          "clientMessageIDs": [
            {"type": "Success", "data": "id123"},
            {"type": "Success", "data": "id456"},
            {"type": "Error", "data": {"id": "id789", "error": "Something went wrong"}},
            {"type": "SerializationError", "data": "message"},
            {"type": "InvalidRequest"}
          ]
        }"#;

    let request =
      serde_json::from_str::<SendConfirmation>(example_payload).unwrap();

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
          "type": "SendRequest",
          "clientMessageIDs": []
        }"#;

    let request =
      serde_json::from_str::<SendConfirmation>(example_payload).unwrap();
    let expected_client_message_ids: Vec<MessageSentStatus> = Vec::new();

    assert_eq!(request.client_message_ids, expected_client_message_ids);
  }
}
