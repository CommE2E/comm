mod session;

use crate::database::DatabaseClient;
use crate::CONFIG;
use futures_util::StreamExt;
use lapin::options::{BasicConsumeOptions, QueueDeclareOptions};
use lapin::types::FieldTable;
use std::net::SocketAddr;
use std::{env, io::Error};
use tokio::net::{TcpListener, TcpStream};
use tracing::{debug, error, info};

pub async fn run_server(
  db_client: DatabaseClient,
  amqp_connection: &lapin::Connection,
) -> Result<(), Error> {
  let addr = env::var("COMM_TUNNELBROKER_WEBSOCKET_ADDR")
    .unwrap_or_else(|_| format!("127.0.0.1:{}", &CONFIG.http_port));

  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
  info!("Listening on: {}", addr);

  while let Ok((stream, addr)) = listener.accept().await {
    let channel = amqp_connection
      .create_channel()
      .await
      .expect("Unable to create amqp channel");
    tokio::spawn(accept_connection(stream, addr, db_client.clone(), channel));
  }

  Ok(())
}

/// Handler for any incoming websocket connections
async fn accept_connection(
  raw_stream: TcpStream,
  addr: SocketAddr,
  db_client: DatabaseClient,
  amqp_channel: lapin::Channel,
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

  // We don't know the identity of the device until it sends the session
  // request over the websocket connection
  let mut session = if let Some(Ok(first_msg)) = incoming.next().await {
    if let Ok(mut session) = session::WebsocketSession::from_frame(
      outgoing,
      db_client.clone(),
      first_msg,
    ) {
      // TODO: Authenticate device
      session::consume_error(session.deliver_persisted_messages().await);
      session
    } else {
      error!("Device failed to send valid connection request.");
      return;
    }
  } else {
    error!("Device closed connection before sending first message");
    return;
  };

  let _amqp_queue = amqp_channel
    .queue_declare(
      &session.device_info.device_id,
      QueueDeclareOptions::default(),
      FieldTable::default(),
    )
    .await
    .expect(&format!(
      "Failed to create amqp queue for device: {}",
      &session.device_info.device_id
    ));

  let mut amqp_consumer = amqp_channel
    .basic_consume(
      &session.device_info.device_id,
      "tunnelbroker",
      BasicConsumeOptions::default(),
      FieldTable::default(),
    )
    .await
    .expect("Failed to create amqp consumer.");

  // Poll for messages either being sent to the device (rx)
  // or messages being received from the device (incoming)
  loop {
    debug!("Polling for messages from: {}", addr);
    tokio::select! {
      Some(Ok(delivery)) = amqp_consumer.next() => {
        if let Ok(message) = std::str::from_utf8(&delivery.data) {
          session.send_message_to_device(message.to_string()).await;
        } else {
          error!("Invalid payload");
        }
      },
      device_message = incoming.next() => {
        match device_message {
          Some(Ok(msg)) => {
            session::consume_error(session.handle_websocket_frame_from_device(msg).await);
          }
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
