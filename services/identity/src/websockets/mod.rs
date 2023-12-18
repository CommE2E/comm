use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;
use std::sync::Arc;

use elastic::client::responses::SearchResponse;
use futures::lock::Mutex;
use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use hyper::upgrade::Upgraded;
use hyper::{Body, Request, Response, StatusCode};
use hyper_tungstenite::tungstenite::Message;
use hyper_tungstenite::HyperWebsocket;
use hyper_tungstenite::WebSocketStream;
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tracing::{debug, error, info};

use crate::config::CONFIG;
use crate::constants::IDENTITY_SERVICE_WEBSOCKET_ADDR;

#[derive(Serialize, Deserialize)]
struct Query {
  query: Prefix,
}

#[derive(Serialize, Deserialize)]
struct Prefix {
  prefix: Username,
}

#[derive(Serialize, Deserialize)]
struct Username {
  username: String,
}

#[derive(Serialize, Deserialize)]
struct User {
  #[serde(rename = "userID")]
  user_id: String,
  username: String,
}

pub type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum WebsocketError {
  InvalidMessage,
  SendError,
  SearchError,
  SerializationError,
}

struct WebsocketService {
  addr: SocketAddr,
}

impl hyper::service::Service<Request<Body>> for WebsocketService {
  type Response = Response<Body>;
  type Error = BoxedError;
  type Future =
    Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

  fn poll_ready(
    &mut self,
    _: &mut std::task::Context<'_>,
  ) -> std::task::Poll<Result<(), Self::Error>> {
    std::task::Poll::Ready(Ok(()))
  }

  fn call(&mut self, mut req: Request<Body>) -> Self::Future {
    let addr = self.addr;

    let future = async move {
      tracing::info!(
        "Incoming HTTP request on WebSocket port: {} {}",
        req.method(),
        req.uri().path()
      );
      if hyper_tungstenite::is_upgrade_request(&req) {
        let (response, websocket) = hyper_tungstenite::upgrade(&mut req, None)?;
        debug!("Upgraded WebSocket connection from {}", addr);

        tokio::spawn(async move {
          accept_connection(websocket, addr).await;
        });

        return Ok(response);
      }

      debug!(
        "Incoming HTTP request on WebSocket port: {} {}",
        req.method(),
        req.uri().path()
      );

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

pub async fn run_server() -> Result<(), BoxedError> {
  let addr: SocketAddr = IDENTITY_SERVICE_WEBSOCKET_ADDR.parse()?;
  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

  info!("WebSocket Listening on {}", addr);

  let mut http = hyper::server::conn::Http::new();
  http.http1_only(true);
  http.http1_keep_alive(true);

  while let Ok((stream, addr)) = listener.accept().await {
    let connection = http
      .serve_connection(stream, WebsocketService { addr })
      .with_upgrades();

    tokio::spawn(async move {
      if let Err(err) = connection.await {
        error!("Error serving HTTP/WebSocket connection: {:?}", err);
      }
    });
  }

  Ok(())
}

async fn send_search_request(
  url: &str,
  json_body: String,
) -> Result<reqwest::Response, reqwest::Error> {
  let client = reqwest::Client::new();

  client
    .post(url)
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .body(json_body)
    .send()
    .await
}

async fn send_error_response(
  error: WebsocketError,
  outgoing: Arc<Mutex<SplitSink<WebSocketStream<Upgraded>, Message>>>,
) {
  let response_msg = serde_json::json!({
    "action": "errorMessage",
    "error": format!("{}", error)
  });

  match serde_json::to_string(&response_msg) {
    Ok(serialized_response) => {
      if let Err(send_error) = outgoing
        .lock()
        .await
        .send(Message::Text(serialized_response))
        .await
      {
        error!("Failed to send error response: {:?}", send_error);
      }
    }
    Err(serialize_error) => {
      error!(
        "Failed to serialize the error response: {:?}",
        serialize_error
      );
    }
  }
}

async fn accept_connection(hyper_ws: HyperWebsocket, addr: SocketAddr) {
  debug!("Incoming WebSocket connection from {}", addr);

  let ws_stream = match hyper_ws.await {
    Ok(stream) => stream,
    Err(e) => {
      error!("WebSocket handshake error: {}", e);
      return;
    }
  };

  let (outgoing, mut incoming) = ws_stream.split();

  let outgoing = Arc::new(Mutex::new(outgoing));

  let opensearch_url =
    format!("https://{}/users/_search/", &CONFIG.opensearch_endpoint);

  while let Some(message) = incoming.next().await {
    match message {
      Ok(Message::Close(_)) => {
        debug!("Connection to {} closed.", addr);
        break;
      }
      Ok(Message::Pong(_)) => {
        debug!("Received Pong message from {}", addr);
      }
      Ok(Message::Ping(msg)) => {
        debug!("Received Ping message from {}", addr);
        if let Err(e) = outgoing.lock().await.send(Message::Pong(msg)).await {
          error!("Error sending message: {}", e);
        }
      }
      Ok(Message::Text(text)) => {
        let prefix_query = Query {
          query: Prefix {
            prefix: Username {
              username: text.trim().to_string(),
            },
          },
        };

        let json_body = match serde_json::to_string(&prefix_query) {
          Ok(json_body) => json_body,
          Err(e) => {
            error!("Error serializing prefix query: {}", e);
            send_error_response(
              WebsocketError::SerializationError,
              outgoing.clone(),
            )
            .await;
            continue;
          }
        };

        let response = send_search_request(&opensearch_url, json_body).await;

        let response_text = match response {
          Ok(response) => match response.text().await {
            Ok(text) => text,
            Err(e) => {
              error!("Error getting response text: {}", e);
              send_error_response(
                WebsocketError::SearchError,
                outgoing.clone(),
              )
              .await;
              continue;
            }
          },
          Err(e) => {
            error!("Error getting search response: {}", e);
            send_error_response(WebsocketError::SearchError, outgoing.clone()).await;
            continue;
          }
        };

        let search_response: SearchResponse<User> =
          match serde_json::from_str(&response_text) {
            Ok(search_response) => search_response,
            Err(e) => {
              error!("Error deserializing search response: {}", e);
              send_error_response(
                WebsocketError::SerializationError,
                outgoing.clone(),
              )
              .await;
              continue;
            }
          };

        let usernames: Vec<&User> = search_response.documents().collect();

        let response_msg = serde_json::json!({
          "action": "searchResults",
          "results": usernames
        });

        if let Err(e) = outgoing
          .lock()
          .await
          .send(Message::Text(format!("{}", response_msg.to_string())))
          .await
        {
          error!("Error sending message: {}", e);
          send_error_response(WebsocketError::SendError, outgoing.clone())
            .await;
          continue;
        }
      }
      Err(e) => {
        error!("Error in WebSocket message: {}", e);
        send_error_response(WebsocketError::InvalidMessage, outgoing.clone())
          .await;
        continue;
      }
      _ => {}
    }
  }

  if let Err(e) = outgoing.lock().await.close().await {
    error!("Failed to close WebSocket connection: {}", e);
  };
}
