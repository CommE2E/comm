mod proto {
  tonic::include_proto!("tunnelbroker");
}

use commtest::identity::device::register_user_device;
use commtest::service_addr;
use commtest::tunnelbroker::socket::{
  create_socket, receive_message, send_message, WebSocketMessageToDevice,
};

use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;
use proto::MessageToDevice;
use std::time::Duration;
use tokio::time::sleep;

use tunnelbroker_messages::RefreshKeyRequest;

#[tokio::test]
async fn send_refresh_request() {
  // Create session as a keyserver
  let device_info = register_user_device(None, None).await;
  let mut socket = create_socket(&device_info).await.unwrap();

  // Send request for keyserver to refresh keys (identity service)
  let mut tunnelbroker_client =
    TunnelbrokerServiceClient::connect(service_addr::TUNNELBROKER_GRPC)
      .await
      .unwrap();

  let refresh_request = RefreshKeyRequest {
    device_id: device_info.device_id.clone(),
    number_of_keys: 5,
  };

  let payload = serde_json::to_string(&refresh_request).unwrap();
  let request = MessageToDevice {
    device_id: device_info.device_id.clone(),
    payload,
  };
  let grpc_message = tonic::Request::new(request);

  tunnelbroker_client
    .send_message_to_device(grpc_message)
    .await
    .unwrap();

  // Have keyserver receive any websocket messages
  let response = receive_message(&mut socket).await.unwrap();

  // Check that message received by keyserver matches what identity server
  // issued
  let serialized_response: RefreshKeyRequest =
    serde_json::from_str(&response).unwrap();
  assert_eq!(serialized_response, refresh_request);
}

#[tokio::test]
async fn test_messages_order() {
  let sender = register_user_device(None, None).await;
  let receiver = register_user_device(None, None).await;

  let messages = vec![
    WebSocketMessageToDevice {
      device_id: receiver.device_id.clone(),
      payload: "first message".to_string(),
    },
    WebSocketMessageToDevice {
      device_id: receiver.device_id.clone(),
      payload: "second message".to_string(),
    },
    WebSocketMessageToDevice {
      device_id: receiver.device_id.clone(),
      payload: "third message".to_string(),
    },
  ];

  let mut sender_socket = create_socket(&sender).await.unwrap();

  for msg in messages.clone() {
    send_message(&mut sender_socket, msg).await.unwrap();
  }

  // Wait a specified duration to ensure that message had time to persist
  sleep(Duration::from_millis(100)).await;

  let mut receiver_socket = create_socket(&receiver).await.unwrap();

  for msg in messages {
    let response = receive_message(&mut receiver_socket).await.unwrap();
    assert_eq!(msg.payload, response);
  }
}
