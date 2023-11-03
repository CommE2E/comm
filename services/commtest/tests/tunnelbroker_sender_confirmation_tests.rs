use commtest::identity::device::create_device;
use commtest::identity::olm_account_infos::{
  DEFAULT_CLIENT_KEYS, MOCK_CLIENT_KEYS_1, MOCK_CLIENT_KEYS_2,
};
use commtest::tunnelbroker::socket::{create_socket, receive_message};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::Message;
use tunnelbroker_messages::{
  MessageSentStatus, MessageToDeviceRequest, MessageToDeviceRequestStatus,
};

/// Tests of responses sent from Tunnelberoker to client
/// trying to send message to other device

#[tokio::test]
async fn get_confirmation() {
  let sender = create_device(Some(&MOCK_CLIENT_KEYS_1)).await;
  let receiver = create_device(Some(&MOCK_CLIENT_KEYS_2)).await;

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

  let mut sender_socket = create_socket(&sender).await;
  sender_socket
    .send(Message::Text(serialized_request))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    let expected_response = MessageToDeviceRequestStatus {
      client_message_ids: vec![MessageSentStatus::Success(client_message_id)],
    };
    let expected_payload = serde_json::to_string(&expected_response).unwrap();
    let received_payload = response.to_text().unwrap();
    assert_eq!(received_payload, expected_payload);
  };

  // Connect receiver to flush DDB and avoid polluting other tests
  let mut receiver_socket = create_socket(&receiver).await;
  let receiver_response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(payload, receiver_response);
}

#[tokio::test]
async fn get_serialization_error() {
  let sender = create_device(Some(&DEFAULT_CLIENT_KEYS)).await;
  let message = "some bad json".to_string();

  let mut sender_socket = create_socket(&sender).await;
  sender_socket
    .send(Message::Text(message.clone()))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    let expected_response = MessageToDeviceRequestStatus {
      client_message_ids: vec![MessageSentStatus::SerializationError(message)],
    };
    let expected_payload = serde_json::to_string(&expected_response).unwrap();
    let received_payload = response.to_text().unwrap();
    assert_eq!(received_payload, expected_payload);
  };
}

#[tokio::test]
async fn get_invalid_request_error() {
  let sender = create_device(Some(&DEFAULT_CLIENT_KEYS)).await;

  let mut sender_socket = create_socket(&sender).await;
  sender_socket
    .send(Message::Binary(vec![]))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = sender_socket.next().await {
    let expected_response = MessageToDeviceRequestStatus {
      client_message_ids: vec![MessageSentStatus::InvalidRequest],
    };
    let expected_payload = serde_json::to_string(&expected_response).unwrap();
    let received_payload = response.to_text().unwrap();
    assert_eq!(received_payload, expected_payload);
  };
}
