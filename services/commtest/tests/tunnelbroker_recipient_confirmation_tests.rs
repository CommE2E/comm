use commtest::identity::device::register_user_device;
use commtest::tunnelbroker::socket::{
  create_socket, receive_message, send_message, WebSocketMessageToDevice,
};

use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tokio::time::sleep;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::Message::Close;
use tunnelbroker_messages::MessageToDevice;

#[tokio::test]
async fn deliver_until_confirmation_not_connected() {
  let sender = register_user_device(None, None).await;
  let receiver = register_user_device(None, None).await;

  // send message to not connected client
  let mut sender_socket = create_socket(&sender).await.unwrap();

  let request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "message from deliver_until_confirmation_not_connected"
      .to_string(),
  };
  send_message(&mut sender_socket, request.clone())
    .await
    .unwrap();

  // wait a specified duration to ensure that message had time to persist
  sleep(Duration::from_millis(100)).await;

  let mut receiver_socket = create_socket(&receiver).await.unwrap();

  // receive message for the first time (without confirmation)
  let Some(Ok(response)) = receiver_socket.next().await else {
    panic!("Receiving first message failed")
  };

  let message = response.to_text().unwrap();
  let message_to_device =
    serde_json::from_str::<MessageToDevice>(message).unwrap();
  assert_eq!(request.payload, message_to_device.payload);

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
  let sender = register_user_device(None, None).await;
  let receiver = register_user_device(None, None).await;

  // send message to connected client
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
  let Some(Ok(response)) = receiver_socket.next().await else {
    panic!("Receiving first message failed")
  };

  let message = response.to_text().unwrap();
  let message_to_device =
    serde_json::from_str::<MessageToDevice>(message).unwrap();
  assert_eq!(request.payload, message_to_device.payload);

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
async fn test_confirming_deleted_message() {
  let sender = register_user_device(None, None).await;
  let receiver = register_user_device(None, None).await;

  // send message to connected client
  let mut receiver_socket = create_socket(&receiver).await.unwrap();
  let mut sender_socket = create_socket(&sender).await.unwrap();

  let request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "message to bo confirmed twice".to_string(),
  };
  send_message(&mut sender_socket, request.clone())
    .await
    .unwrap();

  // receive a message
  let Some(Ok(response)) = receiver_socket.next().await else {
    panic!("Receiving first message failed")
  };

  let message = response.to_text().unwrap();
  let message_to_device =
    serde_json::from_str::<MessageToDevice>(message).unwrap();
  assert_eq!(request.payload, message_to_device.payload);

  let confirmation = tunnelbroker_messages::MessageReceiveConfirmation {
    message_ids: vec![message_to_device.message_id],
  };
  let serialized_confirmation = serde_json::to_string(&confirmation).unwrap();

  // send confirmation twice
  receiver_socket
    .send(Message::Text(serialized_confirmation.clone()))
    .await
    .expect("Error while sending confirmation");
  receiver_socket
    .send(Message::Text(serialized_confirmation))
    .await
    .expect("Error while sending confirmation");

  // test if socket is still alive by sending and receiving a message
  let second_request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "second request".to_string(),
  };
  send_message(&mut sender_socket, second_request.clone())
    .await
    .unwrap();

  let response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(second_request.payload, response);
}

#[tokio::test]
async fn test_confirming() {
  let sender = register_user_device(None, None).await;
  let receiver = register_user_device(None, None).await;

  // send message to connected client
  let mut receiver_socket = create_socket(&receiver).await.unwrap();
  let mut sender_socket = create_socket(&sender).await.unwrap();

  // send first message
  let first_request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "first request".to_string(),
  };
  send_message(&mut sender_socket, first_request.clone())
    .await
    .unwrap();

  // receive a first message
  let response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(first_request.payload, response);

  // restart connection
  receiver_socket
    .send(Close(None))
    .await
    .expect("Failed to send message");

  tokio::time::sleep(Duration::from_millis(200)).await;
  receiver_socket = create_socket(&receiver).await.unwrap();

  // send second message
  let second_request = WebSocketMessageToDevice {
    device_id: receiver.device_id.clone(),
    payload: "second request".to_string(),
  };
  send_message(&mut sender_socket, second_request.clone())
    .await
    .unwrap();

  // make sure only second message is received
  let response = receive_message(&mut receiver_socket).await.unwrap();
  assert_eq!(second_request.payload, response)
}
