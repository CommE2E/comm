//! Message sent from Tunnelbroker to WebSocket as a response to
//! ConnectionInitializationMessage.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", content = "data")]
pub enum ConnectionInitializationStatus {
  Success,
  Error(String),
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct ConnectionInitializationResponse {
  pub status: ConnectionInitializationStatus,
}

#[cfg(test)]
mod connection_init_response_tests {
  use super::*;

  #[test]
  fn test_connection_init_response_success() {
    let example_payload = r#"{
          "type":"ConnectionInitializationResponse",
          "status": {"type":"Success"}
        }"#;

    let request =
      serde_json::from_str::<ConnectionInitializationResponse>(example_payload)
        .unwrap();

    assert_eq!(request.status, ConnectionInitializationStatus::Success);
  }

  #[test]
  fn test_connection_init_response_error() {
    let example_payload = r#"{
          "type": "ConnectionInitializationResponse",
          "status": {
            "type":"Error",
            "data":"Something went wrong"
          }
        }"#;

    let request =
      serde_json::from_str::<ConnectionInitializationResponse>(example_payload)
        .unwrap();

    assert_eq!(
      request.status,
      ConnectionInitializationStatus::Error("Something went wrong".into())
    );
  }
}
