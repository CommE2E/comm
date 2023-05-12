mod session;

use crate::database::DatabaseClient;
use crate::CONFIG;
use futures_util::StreamExt;
use std::net::SocketAddr;
use std::{env, io::Error};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tracing::{debug, info};

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

  let (outgoing, mut incoming) = ws_stream.split();
  // Create channel for messages to be passed to this connection
  let (tx, mut rx) = mpsc::unbounded_channel::<String>();

  let mut session = session::WebsocketSession::new(outgoing, db_client.clone());

  // Poll for messages either being sent to the device (rx)
  // or messages being received from the device (incoming)
  loop {
    debug!("Polling for messages from: {}", addr);
    tokio::select! {
      Some(message) = rx.recv() => { session.send_message_to_device(message).await; },
      device_message = incoming.next() => {
        match device_message {
          Some(Ok(msg)) => session.handle_websocket_frame_from_device(msg, tx.clone()).await,
          _ => {
            debug!("Connection to {} closed remotely.", addr);
            break;
          }
        }
      },
      else => {
        debug!("Unhealthy connection for: {}", addr);
        break;
      },
    }
  }

  info!("Unregistering connection to: {}", addr);
  session.close().await
}
