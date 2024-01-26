use std::sync::Arc;

use futures::lock::Mutex;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use hyper::upgrade::Upgraded;
use hyper_tungstenite::tungstenite::Message;
use hyper_tungstenite::WebSocketStream;
use tracing::error;

use crate::websockets::errors;

pub type WebsocketSink =
  Arc<Mutex<SplitSink<WebSocketStream<Upgraded>, Message>>>;

pub async fn send_error_response(
  error: errors::WebsocketError,
  outgoing: Arc<Mutex<SplitSink<WebSocketStream<Upgraded>, Message>>>,
) {
  let response_msg = serde_json::json!({
    "action": "errorMessage",
    "error": format!("{}", error)
  });

  match serde_json::to_string(&response_msg) {
    Ok(serialized_response) => {
      send_message(Message::Text(serialized_response), outgoing).await;
    }
    Err(serialize_error) => {
      error!(
        "Failed to serialize the error response: {:?}",
        serialize_error
      );
    }
  }
}

pub async fn send_message(
  message: Message,
  outgoing: Arc<Mutex<SplitSink<WebSocketStream<Upgraded>, Message>>>,
) {
  if let Err(e) = outgoing.lock().await.send(message).await {
    error!("Failed to send message to device: {}", e);
  }
}
