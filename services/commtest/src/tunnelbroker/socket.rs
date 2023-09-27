use crate::identity::device::DeviceInfo;
use futures_util::SinkExt;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use tunnelbroker_messages::{ConnectionInitializationMessage, DeviceTypes};

pub async fn create_socket(
  device_info: &DeviceInfo,
) -> WebSocketStream<MaybeTlsStream<TcpStream>> {
  let (mut socket, _) = connect_async("ws://localhost:51001")
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
