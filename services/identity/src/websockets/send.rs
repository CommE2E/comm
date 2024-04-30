use std::sync::Arc;

use futures::lock::Mutex;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use hyper::upgrade::Upgraded;
use hyper_tungstenite::tungstenite::Message;
use hyper_tungstenite::WebSocketStream;
use tracing::error;

pub type WebsocketSink =
  Arc<Mutex<SplitSink<WebSocketStream<Upgraded>, Message>>>;

#[tracing::instrument(skip_all)]
pub async fn send_message(message: Message, outgoing: WebsocketSink) {
  if let Err(e) = outgoing.lock().await.send(message).await {
    error!("Search Error: Failed to send message to device: {}", e);
  }
}
