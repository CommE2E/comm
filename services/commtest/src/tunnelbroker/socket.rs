use crate::identity::device::DeviceInfo;
use crate::service_addr;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use tunnelbroker_messages::{
  ConnectionInitializationMessage, DeviceTypes, MessageSentStatus,
  MessageToDevice, MessageToDeviceRequest, MessageToDeviceRequestStatus,
};

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct WebSocketMessageToDevice {
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub payload: String,
}

pub async fn create_socket(
  device_info: &DeviceInfo,
) -> WebSocketStream<MaybeTlsStream<TcpStream>> {
  let (mut socket, _) = connect_async(service_addr::TUNNELBROKER_WS)
    .await
    .expect("Can't connect");

  let session_request = ConnectionInitializationMessage {
    device_id: device_info.device_id.to_string(),
    access_token: device_info.access_token.to_string(),
    user_id: device_info.user_id.to_string(),
    notify_token: None,
    device_type: DeviceTypes::Keyserver,
    device_app_version: None,
    device_os: None,
  };

  let serialized_request = serde_json::to_string(&session_request)
    .expect("Failed to serialize connection request");

  socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  socket
}

pub async fn send_message(
  socket: &mut WebSocketStream<MaybeTlsStream<TcpStream>>,
  message: WebSocketMessageToDevice,
) -> Result<String, Box<dyn std::error::Error>> {
  let client_message_id = uuid::Uuid::new_v4().to_string();
  let request = MessageToDeviceRequest {
    client_message_id: client_message_id.clone(),
    device_id: message.device_id,
    payload: message.payload,
  };

  let serialized_request = serde_json::to_string(&request)?;

  socket.send(Message::Text(serialized_request)).await?;

  if let Some(Ok(response)) = socket.next().await {
    let confirmation: MessageToDeviceRequestStatus =
      serde_json::from_str(response.to_text().unwrap())?;
    if confirmation
      .client_message_ids
      .contains(&MessageSentStatus::Success(client_message_id.clone()))
    {
      return Ok(client_message_id);
    }
  }
  Err("Failed to confirm sent message".into())
}

pub async fn receive_message(
  socket: &mut WebSocketStream<MaybeTlsStream<TcpStream>>,
) -> Result<String, Box<dyn std::error::Error>> {
  if let Some(Ok(response)) = socket.next().await {
    let message = response.to_text().expect("Failed to get response content");
    let message_to_device = serde_json::from_str::<MessageToDevice>(message)
      .expect("Failed to parse MessageToDevice from response");

    let confirmation = tunnelbroker_messages::MessageReceiveConfirmation {
      message_ids: vec![message_to_device.message_id],
    };
    let serialized_confirmation = serde_json::to_string(&confirmation).unwrap();
    socket.send(Message::Text(serialized_confirmation)).await?;

    return Ok(message_to_device.payload);
  }

  Err("Failed to receive message".into())
}
