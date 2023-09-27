mod proto {
  tonic::include_proto!("tunnelbroker");
}
use commtest::identity::device::create_device;
use commtest::tunnelbroker::socket::create_socket;
use futures_util::StreamExt;
use proto::tunnelbroker_service_client::TunnelbrokerServiceClient;
use proto::MessageToDevice;
use tunnelbroker_messages::RefreshKeyRequest;

#[tokio::test]
async fn send_refresh_request() {
  // Create session as a keyserver
  let device_info = create_device().await;
  let mut socket = create_socket(&device_info).await;

  // Send request for keyserver to refresh keys (identity service)
  let mut tunnelbroker_client =
    TunnelbrokerServiceClient::connect("http://localhost:50051")
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
  let response = socket.next().await.unwrap().unwrap();

  // Check that message received by keyserver matches what identity server
  // issued
  let serialized_response: RefreshKeyRequest =
    serde_json::from_str(&response.to_text().unwrap()).unwrap();
  assert_eq!(serialized_response, refresh_request);
}

/// Test that a message to an offline device gets pushed to dynamodb
/// then recalled once a device connects
#[tokio::test]
async fn persist_messages() {
  let device_info = create_device().await;

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

  // Wait one second to ensure that message had time to persist
  use std::{thread, time};
  let ten_millis = time::Duration::from_millis(50);
  thread::sleep(ten_millis);

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
