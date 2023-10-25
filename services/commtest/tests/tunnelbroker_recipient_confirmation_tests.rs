use commtest::identity::device::create_device;
use commtest::identity::olm_account_infos::{
  MOCK_CLIENT_KEYS_1, MOCK_CLIENT_KEYS_2,
};
use commtest::tunnelbroker::socket::{
  create_socket, receive_message, send_message, WebSocketMessageToDevice,
};

use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tokio::time::sleep;
use tokio_tungstenite::tungstenite::Message::Close;
use tunnelbroker_messages::MessageToDevice;

#[tokio::test]
async fn deliver_until_confirmation_not_connected() {
  let sender = create_device(Some(&MOCK_CLIENT_KEYS_1)).await;
  let receiver = create_device(Some(&MOCK_CLIENT_KEYS_2)).await;

  // Send message to not connected client
  let mut sender_socket = create_socket(&sender).await.unwrap();

  let request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "message from deliver_until_confirmation_not_connected"
      .to_string(),
  };
  send_message(&mut sender_socket, request.clone())
    .await
    .unwrap();

  // Wait a specified duration to ensure that message had time to persist
  sleep(Duration::from_millis(100)).await;

  let mut receiver_socket = create_socket(&receiver).await.unwrap();

  // receive message for the first time (without confirmation)
  if let Some(Ok(response)) = receiver_socket.next().await {
    let message = response.to_text().unwrap();
    let message_to_device =
      serde_json::from_str::<MessageToDevice>(message).unwrap();
    assert_eq!(request.payload, message_to_device.payload);
  } else {
    panic!("Receiving first message failed")
  }

  // restart connection
  receiver_socket
    .send(Close(None))
    .await
    .expect("Failed to send message");
  receiver_socket = create_socket(&receiver).await.unwrap();

  // receive message for the second time
  let response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(request.payload, response);
}

#[tokio::test]
async fn deliver_until_confirmation_connected() {
  let sender = create_device(Some(&MOCK_CLIENT_KEYS_1)).await;
  let receiver = create_device(Some(&MOCK_CLIENT_KEYS_2)).await;

  // Send message to connected client
  let mut receiver_socket = create_socket(&receiver).await.unwrap();
  let mut sender_socket = create_socket(&sender).await.unwrap();

  let request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "message from deliver_until_confirmation_connected".to_string(),
  };
  send_message(&mut sender_socket, request.clone())
    .await
    .unwrap();

  // receive message for the first time (without confirmation)
  if let Some(Ok(response)) = receiver_socket.next().await {
    let message = response.to_text().unwrap();
    let message_to_device =
      serde_json::from_str::<MessageToDevice>(message).unwrap();
    assert_eq!(request.payload, message_to_device.payload);
  } else {
    panic!("Receiving first message failed")
  }

  // restart connection
  receiver_socket
    .send(Close(None))
    .await
    .expect("Failed to send message");
  receiver_socket = create_socket(&receiver).await.unwrap();

  // receive message for the second time
  let response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(request.payload, response);
}
