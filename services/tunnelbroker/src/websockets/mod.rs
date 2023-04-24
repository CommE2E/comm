use futures::future;
use futures_util::{StreamExt, TryStreamExt};
use std::net::SocketAddr;
use std::{env, io::Error};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
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

  let (_outgoing, incoming) = ws_stream.split();

  let handle_incoming = incoming.try_for_each(|msg| {
    let message_text = msg.to_text().unwrap();
    debug!("Received message from {}: {}", addr, message_text);

    match handle_message(message_text) {
      Ok(_) => {
        debug!("Successfully handled message: {}", message_text)
      }
      Err(e) => {
        error!("Failed to process message: {}", e);
      }
    };

    future::ok(())
  });

  // Create channel for messages to be passed to this connection
  let (tx, mut rx) = mpsc::unbounded_channel::<Messages>();
  // TODO: Use device's public key, once we support the SessionRequest message
  ACTIVE_CONNECTIONS.insert("test".to_string(), tx.clone());

  tokio::select! {
    Some(_) = rx.recv() => { debug!("Received message from channel") },
    Ok(_) = handle_incoming => { debug!("Received message from websocket" )},
    else => {
      info!("Connection with {} closed.", addr);
      ACTIVE_CONNECTIONS.remove("test");
    }
  }
}

fn handle_message(message: &str) -> Result<(), serde_json::Error> {
  serde_json::from_str::<Messages>(message)?;

  Ok(())
}
