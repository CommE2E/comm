pub mod session;

use crate::database::DatabaseClient;
use crate::websockets::session::SessionError;
use crate::CONFIG;
use futures_util::stream::SplitSink;
use futures_util::StreamExt;
use std::net::SocketAddr;
use std::{env, io::Error};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;
use tracing::{debug, error, info};

use self::session::WebsocketSession;

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
    match initiate_session(outgoing, first_msg, db_client, amqp_channel).await {
      Ok(session) => session,
      Err(_) => {
        error!("Failed to create session with device");
        return;
      }
    }
  } else {
    error!("Failed to create session with device");
    return;
  };

  // Poll for messages either being sent to the device (rx)
  // or messages being received from the device (incoming)
  loop {
    debug!("Polling for messages from: {}", addr);
    tokio::select! {
      Some(Ok(delivery)) = session.next_amqp_message() => {
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

async fn initiate_session(
  outgoing: SplitSink<WebSocketStream<TcpStream>, Message>,
  frame: Message,
  db_client: DatabaseClient,
  amqp_channel: lapin::Channel,
) -> Result<WebsocketSession, session::SessionError> {
  let mut session = session::WebsocketSession::from_frame(
    outgoing,
    db_client.clone(),
    frame,
    &amqp_channel,
  )
  .await
  .map_err(|_| {
    error!("Device failed to send valid connection request.");
    SessionError::InvalidMessage
  })?;

  session::consume_error(session.deliver_persisted_messages().await);

  Ok(session)
}
