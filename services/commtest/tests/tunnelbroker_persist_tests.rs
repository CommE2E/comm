mod proto {
  tonic::include_proto!("tunnelbroker");
}

use commtest::identity::device::create_device;
use commtest::identity::olm_account_infos::{
  MOCK_CLIENT_KEYS_1, MOCK_CLIENT_KEYS_2,
};
use commtest::tunnelbroker::socket::create_socket;
use futures_util::{SinkExt, StreamExt};
use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;
use proto::MessageToDevice;
use std::time::Duration;
use tokio::time::sleep;
use tokio_tungstenite::tungstenite::Message;
use tunnelbroker_messages::{MessageToDeviceRequest, RefreshKeyRequest};

/// Tests that a message to an offline device gets pushed to dynamodb
/// then recalled once a device connects

#[tokio::test]
async fn persist_grpc_messages() {
  let device_info = create_device(None).await;

  // Send request for keyserver to refresh keys (identity service)
  let mut tunnelbroker_client =
    TunnelbrokerServiceClient::connect("http://localhost:50051")
      .await
      .unwrap();

  let refresh_request = RefreshKeyRequest {
    device_id: device_info.device_id.to_string(),
    number_of_keys: 5,
  };

  let payload = serde_json::to_string(&refresh_request).unwrap();
  let request = MessageToDevice {
    device_id: device_info.device_id.to_string(),
    payload,
  };
  let grpc_message = tonic::Request::new(request);
  tunnelbroker_client
    .send_message_to_device(grpc_message)
    .await
    .unwrap();

  // Wait a specified duration to ensure that message had time to persist
  sleep(Duration::from_millis(100)).await;

  let mut socket = create_socket(&device_info).await;
  // Have keyserver receive any websocket messages
  if let Some(Ok(response)) = socket.next().await {
    // Check that message received by keyserver matches what identity server
    // issued
    let serialized_response: RefreshKeyRequest =
      serde_json::from_str(&response.to_text().unwrap()).unwrap();
    assert_eq!(serialized_response, refresh_request);
  };
}

#[tokio::test]
async fn persist_websocket_messages() {
  let sender = create_device(Some(&MOCK_CLIENT_KEYS_1)).await;
  let receiver = create_device(Some(&MOCK_CLIENT_KEYS_2)).await;

  // Send message to not connected client
  let payload = "persisted message";
  let request = MessageToDeviceRequest {
    client_message_id: "mockID".to_string(),
    device_id: receiver.device_id.clone(),
    payload: payload.to_string(),
  };

  let serialized_request = serde_json::to_string(&request)
    .expect("Failed to serialize message to device");

  let mut sender_socket = create_socket(&sender).await;
  sender_socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  // Wait a specified duration to ensure that message had time to persist
  sleep(Duration::from_millis(100)).await;

  // Connect receiver
  let mut receiver_socket = create_socket(&receiver).await;

  // Receive message
  if let Some(Ok(response)) = receiver_socket.next().await {
    let received_payload = response.to_text().unwrap();
    assert_eq!(payload, received_payload);
  };
}
