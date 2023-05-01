use futures_util::SinkExt;
use tokio_tungstenite::{connect_async, tungstenite::Message};
mod proto {
  tonic::include_proto!("tunnelbroker");
}
use futures_util::StreamExt;
use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;
use proto::MessageToDevice;
use tunnelbroker_messages as messages;
use tunnelbroker_messages::RefreshKeyRequest;

#[tokio::test]
async fn send_refresh_request() {
  // Create sesion as a keyserver
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

  // Send request for keyserver to refresh keys (identity service)
  let mut tunnelbroker_client =
    TunnelbrokerServiceClient::connect("http://localhost:50051")
      .await
      .unwrap();

  let refresh_request = messages::RefreshKeyRequest {
    device_id: "foo".to_string(),
    number_of_keys: 5,
  };

  let payload = serde_json::to_string(&refresh_request).unwrap();
  let request = MessageToDevice {
    device_id: "foo".to_string(),
    payload,
  };
  let grpc_message = tonic::Request::new(request);
  tunnelbroker_client
    .send_message_to_device(grpc_message)
    .await
    .unwrap();

  // Have keyserver receive any websocket messages
  let response = socket.next().await.unwrap().unwrap();

  // Check that message received by keyserver matches what identity server
  // issued
  let serialized_response: RefreshKeyRequest =
    serde_json::from_str(&response.to_text().unwrap()).unwrap();
  assert_eq!(serialized_response, refresh_request);
}
