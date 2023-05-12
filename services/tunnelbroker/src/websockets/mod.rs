use futures::future;
use futures_util::stream::SplitSink;
use futures_util::SinkExt;
use futures_util::{StreamExt, TryStreamExt};
use std::net::SocketAddr;
use std::{env, io::Error};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;
use tracing::{debug, error, info};
use tunnelbroker_messages::messages::Messages;

use crate::ACTIVE_CONNECTIONS;

pub async fn run_server() -> Result<(), Error> {
  let addr = env::var("COMM_TUNNELBROKER_WEBSOCKET_ADDR")
    .unwrap_or_else(|_| "127.0.0.1:51001".to_string());

  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
  info!("Listening on: {}", addr);

  while let Ok((stream, addr)) = listener.accept().await {
    tokio::spawn(accept_connection(stream, addr));
  }

  Ok(())
}

/// Handler for any incoming websocket connections
async fn accept_connection(raw_stream: TcpStream, addr: SocketAddr) {
  debug!("Incoming connection from: {}", addr);

  let ws_stream = match tokio_tungstenite::accept_async(raw_stream).await {
    Ok(stream) => stream,
    Err(e) => {
      info!(
        "Failed to establish connection with {}. Reason: {}",
        addr, e
      );
      return;
    }
  };

  let (mut outgoing, incoming) = ws_stream.split();
  // Create channel for messages to be passed to this connection
  let (tx, mut rx) = mpsc::unbounded_channel::<String>();

  let handle_incoming = incoming.try_for_each(|msg| {
    debug!("Received message from {}", addr);
    match msg {
      Message::Text(text) => {
        match handle_message_from_device(&text, &tx) {
          Ok(_) => {
            debug!("Successfully handled message: {}", text)
          }
          Err(e) => {
            error!("Failed to process message: {}", e);
          }
        };
      }
      _ => {
        error!("Invalid message was received");
      }
    }

    future::ok(())
  });

  debug!("Polling for messages from: {}", addr);
  // Poll for messages either being sent to the device (rx)
  // or messages being received from the device (handle_incoming)
  tokio::select! {
    Some(message) = rx.recv() => { handle_message_from_service(message, &mut outgoing).await; },
    Ok(_) = handle_incoming => { debug!("Received message from websocket") },
    else => {
      info!("Connection with {} closed.", addr);
      ACTIVE_CONNECTIONS.remove("test");
    }
  }
}

fn handle_message_from_device(
  message: &str,
  tx: &tokio::sync::mpsc::UnboundedSender<std::string::String>,
) -> Result<(), serde_json::Error> {
  match serde_json::from_str::<Messages>(message)? {
    Messages::SessionRequest(session_info) => {
      ACTIVE_CONNECTIONS.insert(session_info.device_id, tx.clone());
    }
    _ => {
      debug!("Received invalid request");
    }
  }

  Ok(())
}

async fn handle_message_from_service(
  incoming_payload: String,
  outgoing: &mut SplitSink<WebSocketStream<tokio::net::TcpStream>, Message>,
) {
  if let Err(e) = outgoing.send(Message::Text(incoming_payload)).await {
    error!("Failed to send message to device: {}", e);
  }
}
