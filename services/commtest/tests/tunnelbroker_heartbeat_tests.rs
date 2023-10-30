use commtest::identity::device::create_device;
use commtest::tunnelbroker::socket::create_socket;
use futures_util::sink::SinkExt;
use futures_util::stream::StreamExt;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::Message::Close;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use tunnelbroker_messages::Heartbeat;

async fn receive_and_parse_message(
  socket: &mut WebSocketStream<MaybeTlsStream<TcpStream>>,
) -> Heartbeat {
  if let Some(Ok(response)) = socket.next().await {
    let message = response
      .to_text()
      .expect("Unable to retrieve response content");
    serde_json::from_str::<Heartbeat>(message)
      .expect("Unable to parse Heartbeat from response")
  } else {
    panic!("Received incorrect message type.")
  }
}

#[tokio::test]
async fn test_receiving() {
  let client = create_device(None).await;
  let mut socket = create_socket(&client).await.unwrap();

  let message_to_device = receive_and_parse_message(&mut socket).await;

  assert_eq!(message_to_device, Heartbeat {});

  socket
    .send(Close(None))
    .await
    .expect("Failed to close socket");
}

#[tokio::test]
async fn test_responding() {
  let client = create_device(None).await;
  let mut socket = create_socket(&client).await.unwrap();

  let message_to_device = receive_and_parse_message(&mut socket).await;

  assert_eq!(message_to_device, Heartbeat {});

  let heartbeat = Heartbeat {};
  let serialized = serde_json::to_string(&heartbeat).unwrap();
  socket
    .send(Message::Text(serialized))
    .await
    .expect("Error while sending heartbeat");

  // Receive and parse another heartbeat message
  let message_to_device = receive_and_parse_message(&mut socket).await;

  assert_eq!(message_to_device, Heartbeat {});

  socket
    .send(Close(None))
    .await
    .expect("Failed to close the socket");
}

#[tokio::test]
async fn test_closing() {
  let client = create_device(None).await;
  let mut socket = create_socket(&client).await.unwrap();

  let message_to_device = receive_and_parse_message(&mut socket).await;

  assert_eq!(message_to_device, Heartbeat {});

  // The next message should be a Close message because we did not respond
  // to the Heartbeat.
  // This suggests that the Tunnelbroker might consider the connection
  // as unhealthy and decide to close it.
  if let Some(Ok(response)) = socket.next().await {
    assert_eq!(response, Message::Close(None))
  } else {
    panic!("Received incorrect message type. Expected Close.")
  }
}
