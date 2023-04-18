// Messages sent between tunnelbroker and a device

use serde::{Deserialize, Serialize};

/// The workflow when estabilishing a tunnelbroker connection:
///   - Client sends SessionRequest
///   - Tunnelbroker validates access_token with identity service
///   - Tunnelbroker emits an AMQP message declaring that it has opened a new
///     connection with a given device, so that the respective tunnelbroker
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

#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DeviceTypes {
  Mobile,
  Web,
  Keyserver,
}

/// Message sent by a client to tunnelbroker to initiate a websocket
/// session. Tunnelbroker will then validate the access token with identity
/// service before continuing with the request.
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct SessionRequest {
  pub device_id: String,
  pub access_token: String,
  pub notify_token: Option<String>,
  pub device_type: DeviceTypes,
  pub device_app_version: Option<String>,
  pub device_os: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SessionResponse {
  pub session_id: String,
}

#[cfg(test)]
mod session_tests {
  use super::*;

  #[test]
  fn test_session_deserialization() {
    let example_payload = r#"{
      "type": "sessionRequest",
      "accessToken": "xkdeifjsld",
      "deviceId": "foo",
      "deviceType": "keyserver"
    }"#;

    let request =
      serde_json::from_str::<SessionRequest>(example_payload).unwrap();
    assert_eq!(request.device_id, "foo");
    assert_eq!(request.access_token, "xkdeifjsld");
    assert_eq!(request.device_os, None);
    assert_eq!(request.device_type, DeviceTypes::Keyserver);
  }
}
