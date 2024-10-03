pub mod session;

use crate::amqp::AmqpConnection;
use crate::constants::{SOCKET_HEARTBEAT_TIMEOUT, WS_SESSION_CLOSE_AMQP_MSG};
use crate::database::DatabaseClient;
use crate::notifs::NotifClient;
use crate::websockets::session::SessionError;
use crate::CONFIG;
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use hyper::upgrade::Upgraded;
use hyper::{Body, Request, Response, StatusCode};
use hyper_tungstenite::tungstenite::Message;
use hyper_tungstenite::HyperWebsocket;
use hyper_tungstenite::WebSocketStream;
use std::env;
use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpListener;
use tracing::{debug, error, info, trace, warn};
use tunnelbroker_messages::{
  ConnectionInitializationStatus, DeviceToTunnelbrokerRequestStatus, Heartbeat,
  MessageSentStatus,
};

type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

pub type ErrorWithStreamHandle<S> = (
  session::SessionError,
  SplitSink<WebSocketStream<S>, Message>,
);

use self::session::{handle_first_ws_frame, WebsocketSession};

/// Hyper HTTP service that handles incoming HTTP and websocket connections
/// It handles the initial websocket upgrade request and spawns a task to
/// handle the websocket connection.
/// It also handles regular HTTP requests (currently health check)
struct WebsocketService {
  addr: SocketAddr,
  amqp: AmqpConnection,
  db_client: DatabaseClient,
  notif_client: NotifClient,
}

impl hyper::service::Service<Request<Body>> for WebsocketService {
  type Response = Response<Body>;
  type Error = BoxedError;
  type Future =
    Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

  // This function is called to check if the service is ready to accept
  // connections. Since we don't have any state to check, we're always ready.
  fn poll_ready(
    &mut self,
    _: &mut std::task::Context<'_>,
  ) -> std::task::Poll<Result<(), Self::Error>> {
    std::task::Poll::Ready(Ok(()))
  }

  fn call(&mut self, mut req: Request<Body>) -> Self::Future {
    let addr = self.addr;
    let db_client = self.db_client.clone();
    let amqp = self.amqp.clone();
    let notif_client = self.notif_client.clone();

    let future = async move {
      // Check if the request is a websocket upgrade request.
      if hyper_tungstenite::is_upgrade_request(&req) {
        let (response, websocket) = hyper_tungstenite::upgrade(&mut req, None)?;

        // Spawn a task to handle the websocket connection.
        tokio::spawn(async move {
          accept_connection(websocket, addr, db_client, amqp, notif_client)
            .await;
        });

        // Return the response so the spawned future can continue.
        return Ok(response);
      }

      debug!(
        "Incoming HTTP request on WebSocket port: {} {}",
        req.method(),
        req.uri().path()
      );

      // A simple router for regular HTTP requests
      let response = match req.uri().path() {
        "/health" => Response::new(Body::from("OK")),
        _ => Response::builder()
          .status(StatusCode::NOT_FOUND)
          .body(Body::from("Not found"))?,
      };
      Ok(response)
    };
    Box::pin(future)
  }
}

pub async fn run_server(
  db_client: DatabaseClient,
  amqp_connection: &AmqpConnection,
  notif_client: NotifClient,
) -> Result<(), BoxedError> {
  let addr = env::var("COMM_TUNNELBROKER_WEBSOCKET_ADDR")
    .unwrap_or_else(|_| format!("0.0.0.0:{}", &CONFIG.http_port));

  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
  info!("WebSocket listening on: {}", addr);

  let mut http = hyper::server::conn::Http::new();
  http.http1_only(true);
  http.http1_keep_alive(true);

  while let Ok((stream, addr)) = listener.accept().await {
    let amqp = amqp_connection.clone();
    let connection = http
      .serve_connection(
        stream,
        WebsocketService {
          amqp,
          db_client: db_client.clone(),
          addr,
          notif_client: notif_client.clone(),
        },
      )
      .with_upgrades();

    tokio::spawn(async move {
      if let Err(err) = connection.await {
        error!("Error serving HTTP/WebSocket connection: {:?}", err);
      }
    });
  }

  Ok(())
}

async fn send_error_init_response(
  error: SessionError,
  mut outgoing: SplitSink<WebSocketStream<Upgraded>, Message>,
) {
  let error_response =
    tunnelbroker_messages::ConnectionInitializationResponse {
      status: ConnectionInitializationStatus::Error(error.to_string()),
    };

  match serde_json::to_string(&error_response) {
    Ok(serialized_response) => {
      if let Err(send_error) =
        outgoing.send(Message::Text(serialized_response)).await
      {
        debug!("Failed to send init error response: {:?}", send_error);
      }
    }
    Err(ser_error) => {
      error!("Failed to serialize the error response: {:?}", ser_error);
    }
  }
}

/// Handler for any incoming websocket connections
async fn accept_connection(
  hyper_ws: HyperWebsocket,
  addr: SocketAddr,
  db_client: DatabaseClient,
  amqp_connection: AmqpConnection,
  notif_client: NotifClient,
) {
  debug!("Incoming connection from: {}", addr);

  let ws_stream = match hyper_ws.await {
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
    match initiate_session(
      outgoing,
      first_msg,
      db_client,
      amqp_connection,
      notif_client,
    )
    .await
    {
      Ok(mut session) => {
        let response =
          tunnelbroker_messages::ConnectionInitializationResponse {
            status: ConnectionInitializationStatus::Success,
          };
        let serialized_response = serde_json::to_string(&response).unwrap();

        session
          .send_message_to_device(Message::Text(serialized_response))
          .await;
        session
      }
      Err((err, outgoing)) => {
        debug!("Failed to create session with device: {err:?}");
        send_error_init_response(err, outgoing).await;
        return;
      }
    }
  } else {
    debug!("Failed to create session with device");
    send_error_init_response(SessionError::InvalidMessage, outgoing).await;
    return;
  };

  let mut ping_timeout = Box::pin(tokio::time::sleep(SOCKET_HEARTBEAT_TIMEOUT));
  let mut got_heartbeat_response = true;

  // Poll for messages either being sent to the device (rx)
  // or messages being received from the device (incoming)
  loop {
    trace!("Polling for messages from: {}", addr);
    tokio::select! {
      Some(delivery_result) = session.next_amqp_message() => {
        match delivery_result {
          Ok(delivery) => {
            if let Ok(message) = std::str::from_utf8(&delivery.data) {
              if message == WS_SESSION_CLOSE_AMQP_MSG {
                debug!("Connection to {} closed by server.", addr);
                break;
              } else {
                session.send_message_to_device(Message::Text(message.to_string())).await;
              }
            } else {
              error!("Invalid payload");
            }
          },
          Err(err) => {
            warn!("Session AMQP error: {:?}", err);
            if let Err(e) = session.reset_failed_amqp().await {
              warn!("Connection to {} closed due to failed AMQP restoration: {:?}", addr, e);
              break;
            }
            continue;
          }
        }
      },
      device_message = incoming.next() => {
        let message: Message = match device_message {
          Some(Ok(msg)) => msg,
          _ => {
            debug!("Connection to {} closed remotely.", addr);
            break;
          }
        };
        match message {
          Message::Close(_) => {
            debug!("Connection to {} closed.", addr);
            break;
          }
          Message::Pong(_) => {
            debug!("Received Pong message from {}", addr);
          }
          Message::Ping(msg) => {
            debug!("Received Ping message from {}", addr);
            session.send_message_to_device(Message::Pong(msg)).await;
          }
          Message::Text(msg) => {
            got_heartbeat_response = true;
            ping_timeout = Box::pin(tokio::time::sleep(SOCKET_HEARTBEAT_TIMEOUT));

            let Some(message_status) = session.handle_websocket_frame_from_device(msg).await else {
              continue;
            };
            let request_status = DeviceToTunnelbrokerRequestStatus {
              client_message_ids: vec![message_status]
            };
            if let Ok(response) = serde_json::to_string(&request_status) {
                session.send_message_to_device(Message::text(response)).await;
            } else {
                break;
            }
          }
          _ => {
            error!("Client sent invalid message type");
            let confirmation = DeviceToTunnelbrokerRequestStatus {client_message_ids:  vec![MessageSentStatus::InvalidRequest]};
             if let Ok(response) = serde_json::to_string(&confirmation) {
                session.send_message_to_device(Message::text(response)).await;
            } else {
                break;
            }
          }
        }
      },
      _ = &mut ping_timeout => {
        if !got_heartbeat_response {
          error!("Connection to {} died", addr);
          break;
        }
        let serialized = serde_json::to_string(&Heartbeat {}).unwrap();
        session.send_message_to_device(Message::text(serialized)).await;

        got_heartbeat_response = false;
        ping_timeout = Box::pin(tokio::time::sleep(SOCKET_HEARTBEAT_TIMEOUT));
      }
      else => {
        debug!("Unhealthy connection for: {}", addr);
        break;
      },
    }
  }

  info!("Unregistering connection to: {}", addr);
  session.close().await
}

async fn initiate_session<S: AsyncRead + AsyncWrite + Unpin>(
  outgoing: SplitSink<WebSocketStream<S>, Message>,
  frame: Message,
  db_client: DatabaseClient,
  amqp: AmqpConnection,
  notif_client: NotifClient,
) -> Result<WebsocketSession<S>, ErrorWithStreamHandle<S>> {
  let device_info = match handle_first_ws_frame(frame).await {
    Ok(info) => info,
    Err(e) => return Err((e, outgoing)),
  };

  WebsocketSession::new(outgoing, db_client, device_info, amqp, notif_client)
    .await
}
