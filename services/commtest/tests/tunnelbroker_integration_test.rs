use futures_util::SinkExt;
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::test]
async fn open_websocket_connection() {
  let (mut socket, _) = connect_async("ws://localhost:51001")
    .await
    .expect("Can't connect");

  let session_request = r#"{
      "type": "sessionRequest",
      "accessToken": "xkdeifjsld",
      "deviceId": "foo",
      "deviceType": "keyserver"
    }"#;

  socket
    .send(Message::Text(session_request.to_string()))
    .await
    .expect("Failed to send message");
}
