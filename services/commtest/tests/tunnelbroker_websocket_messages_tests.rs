use commtest::identity::device::register_user_device;
use commtest::tunnelbroker::socket::create_socket;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::{Error, Message, Message::Close};

/// Tests for message types defined in tungstenite crate

#[tokio::test]
async fn test_ping_pong() {
  let device = register_user_device(None, None).await;

  let ping_message = vec![1, 2, 3, 4, 5];

  let mut socket = create_socket(&device).await.unwrap();
  socket
    .send(Message::Ping(ping_message.clone()))
    .await
    .expect("Failed to send message");

  if let Some(Ok(response)) = socket.next().await {
    let received_payload = match response {
      Message::Pong(received_payload) => received_payload,
      unexpected => panic!(
        "Unexpected message type or result. Expected Pong, got: {:?}. ",
        unexpected
      ),
    };
    assert_eq!(ping_message.clone(), received_payload);
  };
}

#[tokio::test]
async fn test_close_message() {
  let device = register_user_device(None, None).await;

  let mut socket = create_socket(&device).await.unwrap();
  socket
    .send(Close(None))
    .await
    .expect("Failed to send message");

  if let Some(response) = socket.next().await {
    assert!(matches!(
      response,
      Err(Error::AlreadyClosed | Error::ConnectionClosed) | Ok(Close(None))
    ));
  };
}
