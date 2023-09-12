mod session;

use crate::database::DatabaseClient;
use crate::websockets::session::SessionError;
use crate::CONFIG;
use futures_util::stream::SplitSink;
use futures_util::StreamExt;
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
use tracing::{debug, error, info};

type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

use self::session::WebsocketSession;

/// Hyper HTTP service that handles incoming HTTP and websocket connections
/// It handles the initial websocket upgrade request and spawns a task to
/// handle the websocket connection.
/// It also handles regular HTTP requests (currently health check)
struct WebsocketService {
  addr: SocketAddr,
  channel: lapin::Channel,
  db_client: DatabaseClient,
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
    let channel = self.channel.clone();

    let future = async move {
      // Check if the request is a websocket upgrade request.
      if hyper_tungstenite::is_upgrade_request(&req) {
        let (response, websocket) = hyper_tungstenite::upgrade(&mut req, None)?;

        // Spawn a task to handle the websocket connection.
        tokio::spawn(async move {
          accept_connection(websocket, addr, db_client, channel).await;
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
  amqp_connection: &lapin::Connection,
) -> Result<(), BoxedError> {
  let addr = env::var("COMM_TUNNELBROKER_WEBSOCKET_ADDR")
    .unwrap_or_else(|_| format!("0.0.0.0:{}", &CONFIG.http_port));

  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
  info!("WebSocket listening on: {}", addr);

  let mut http = hyper::server::conn::Http::new();
  http.http1_only(true);
  http.http1_keep_alive(true);

  while let Ok((stream, addr)) = listener.accept().await {
    let channel = amqp_connection
      .create_channel()
      .await
      .expect("Failed to create AMQP channel");
    let connection = http
      .serve_connection(
        stream,
        WebsocketService {
          channel,
          db_client: db_client.clone(),
          addr,
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

/// Handler for any incoming websocket connections
async fn accept_connection(
  hyper_ws: HyperWebsocket,
  addr: SocketAddr,
  db_client: DatabaseClient,
  amqp_channel: lapin::Channel,
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

async fn initiate_session<S: AsyncRead + AsyncWrite + Unpin>(
  outgoing: SplitSink<WebSocketStream<S>, Message>,
  frame: Message,
  db_client: DatabaseClient,
  amqp_channel: lapin::Channel,
) -> Result<WebsocketSession<S>, session::SessionError> {
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
