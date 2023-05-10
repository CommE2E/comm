mod session;

use crate::database::DatabaseClient;
use crate::CONFIG;
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

pub async fn run_server(db_client: DatabaseClient) -> Result<(), Error> {
  let addr = env::var("COMM_TUNNELBROKER_WEBSOCKET_ADDR")
    .unwrap_or_else(|_| format!("127.0.0.1:{}", &CONFIG.http_port));

  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
  info!("Listening on: {}", addr);

  while let Ok((stream, addr)) = listener.accept().await {
    tokio::spawn(accept_connection(stream, addr, db_client.clone()));
  }

  Ok(())
}

/// Handler for any incoming websocket connections
async fn accept_connection(
  raw_stream: TcpStream,
  addr: SocketAddr,
  db_client: DatabaseClient,
) {
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

  let session = session::WebsocketSession::new(tx.clone(), db_client.clone());
  let handle_incoming = incoming.try_for_each(|msg| async {
    debug!("Received message from {}", addr);
    match msg {
      Message::Text(text) => {
        match session.handle_message_from_device(&text).await {
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
    Ok(())
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

async fn handle_message_from_service(
  incoming_payload: String,
  outgoing: &mut SplitSink<WebSocketStream<tokio::net::TcpStream>, Message>,
) {
  let message = serde_json::from_str(&incoming_payload)
    .expect("Unable to parse incoming request");
  let payload =
    serde_json::to_string(&message).expect("Unable to create payload");
  match message {
    Messages::RefreshKeysRequest(_) => {
      let response = Message::Text(payload);
      outgoing
        .send(response)
        .await
        .expect("Failed to send message");
    }
    _ => {
      debug!("Recieved invalid external message");
    }
  }
}
