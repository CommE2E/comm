use commtest::identity::device::register_user_device;
use commtest::tunnelbroker::socket::{create_socket, receive_message};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::Message;
use tunnelbroker_messages::{
  DeviceToTunnelbrokerRequestStatus, MessageSentStatus, MessageToDeviceRequest,
};

/// Tests of responses sent from Tunnelberoker to client
/// trying to send message to other device

#[tokio::test]
async fn get_confirmation() {
  let sender = register_user_device(None, None).await;
  let receiver = register_user_device(None, None).await;

  let client_message_id = "mockID".to_string();

  // Send message to not connected client
  let payload = "persisted message";
  let request = MessageToDeviceRequest {
    client_message_id: client_message_id.clone(),
    device_id: receiver.device_id.clone(),
    payload: payload.to_string(),
  };

  let serialized_request = serde_json::to_string(&request)
    .expect("Failed to serialize message to device");

  let mut sender_socket = create_socket(&sender).await.unwrap();
  sender_socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    let expected_response = DeviceToTunnelbrokerRequestStatus {
      client_message_ids: vec![MessageSentStatus::Success(client_message_id)],
    };
    let expected_payload = serde_json::to_string(&expected_response).unwrap();
    let received_payload = response.to_text().unwrap();
    assert_eq!(received_payload, expected_payload);
  };

  // Connect receiver to flush DDB and avoid polluting other tests
  let mut receiver_socket = create_socket(&receiver).await.unwrap();
  let receiver_response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(payload, receiver_response);
}

#[tokio::test]
async fn get_serialization_error() {
  let sender = register_user_device(None, None).await;
  let message = "some bad json".to_string();

  let mut sender_socket = create_socket(&sender).await.unwrap();
  sender_socket
    .send(Message::Text(message.clone()))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    let expected_response = DeviceToTunnelbrokerRequestStatus {
      client_message_ids: vec![MessageSentStatus::SerializationError(message)],
    };
    let expected_payload = serde_json::to_string(&expected_response).unwrap();
    let received_payload = response.to_text().unwrap();
    assert_eq!(received_payload, expected_payload);
  };
}

#[tokio::test]
async fn get_invalid_request_error() {
  let sender = register_user_device(None, None).await;

  let mut sender_socket = create_socket(&sender).await.unwrap();
  sender_socket
    .send(Message::Binary(vec![]))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    let expected_response = DeviceToTunnelbrokerRequestStatus {
      client_message_ids: vec![MessageSentStatus::InvalidRequest],
    };
    let expected_payload = serde_json::to_string(&expected_response).unwrap();
    let received_payload = response.to_text().unwrap();
    assert_eq!(received_payload, expected_payload);
  };
}
