//! The first message sent from WebSocket client to Tunnelbroker.

use serde::{Deserialize, Serialize};

/// The workflow when establishing a Tunnelbroker connection:
///   - Client sends ConnectionInitializationMessage
///   - Tunnelbroker validates access_token with identity service
///   - Tunnelbroker emits an AMQP message declaring that it has opened a new
///     connection with a given device, so that the respective Tunnelbroker
///     instance can close the existing connection.
///   - Tunnelbroker returns a session_id representing that the connection was
///     accepted
///   - Tunnelbroker will flush all messages related to device from RabbitMQ.
///     This must be done first before flushing DynamoDB to prevent duplicated
///     messages.
///   - Tunnelbroker flushes all messages in DynamoDB
///   - Tunnelbroker orders messages by creation date (oldest first), and sends
///     messages to device
///   - Tunnelbroker then polls for incoming messages from device

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub enum DeviceTypes {
  Mobile,
  Web,
  Keyserver,
}

/// Message sent by a client to Tunnelbroker to initiate a websocket
/// session. Tunnelbroker will then validate the access token with identity
/// service before continuing with the request.
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct ConnectionInitializationMessage {
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub access_token: String,
  #[serde(rename = "userID")]
  pub user_id: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
}

/// Message sent by a client to Tunnelbroker to initiate unauthenticated
/// websocket session. In contrast to [`ConnectionInitializationMessage`],
/// Tunnelbroker won't validate access token, but session capabilities
/// will be limited.
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct AnonymousInitializationMessage {
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
}

#[cfg(test)]
mod session_tests {
  use super::*;

  #[test]
  fn test_session_deserialization() {
    let example_payload = r#"{
      "type": "sessionRequest",
      "accessToken": "xkdeifjsld",
      "deviceID": "foo",
      "userID": "alice",
      "deviceType": "keyserver"
    }"#;

    let request =
      serde_json::from_str::<ConnectionInitializationMessage>(example_payload)
        .unwrap();
    assert_eq!(request.device_id, "foo");
    assert_eq!(request.access_token, "xkdeifjsld");
    assert_eq!(request.device_os, None);
    assert_eq!(request.device_type, DeviceTypes::Keyserver);
  }
}
