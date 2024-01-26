use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;
use std::sync::Arc;

use elastic::client::responses::SearchResponse;
use futures::lock::Mutex;
use futures_util::{SinkExt, StreamExt};
use hyper::{Body, Request, Response, StatusCode};
use hyper_tungstenite::tungstenite::Message;
use hyper_tungstenite::HyperWebsocket;
use identity_search_messages::{
  ConnectionInitializationResponse, ConnectionInitializationStatus,
  SearchResult, User,
};
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tracing::{debug, error, info};

mod auth;
mod send;

use crate::config::CONFIG;
use crate::constants::IDENTITY_SERVICE_WEBSOCKET_ADDR;
use send::{send_error_response, send_message, WebsocketSink};

pub mod errors;

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

struct WebsocketService {
  addr: SocketAddr,
}

impl hyper::service::Service<Request<Body>> for WebsocketService {
  type Response = Response<Body>;
  type Error = errors::BoxedError;
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
      tracing::debug!(
        "Incoming HTTP request on WebSocket port: {} {}",
        req.method(),
        req.uri().path()
      );
      if hyper_tungstenite::is_upgrade_request(&req) {
        let (response, websocket) = hyper_tungstenite::upgrade(&mut req, None)?;

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

pub async fn run_server() -> Result<(), errors::BoxedError> {
  let addr: SocketAddr = IDENTITY_SERVICE_WEBSOCKET_ADDR.parse()?;
  let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

  info!("Listening to WebSocket traffic on {}", addr);

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

async fn close_connection(outgoing: WebsocketSink) {
  if let Err(e) = outgoing.lock().await.close().await {
    error!("Error closing connection: {}", e);
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

  if let Some(Ok(auth_message)) = incoming.next().await {
    match auth_message {
      Message::Text(text) => {
        if let Err(auth_error) = auth::handle_auth_message(&text).await {
          let error_response = ConnectionInitializationResponse {
            status: ConnectionInitializationStatus::Error(
              auth_error.to_string(),
            ),
          };
          let serialized_response = serde_json::to_string(&error_response)
            .expect("Error serializing auth error response");

          send_message(Message::Text(serialized_response), outgoing.clone())
            .await;

          close_connection(outgoing).await;
          return;
        } else {
          let success_response = ConnectionInitializationResponse {
            status: ConnectionInitializationStatus::Success,
          };
          let serialized_response = serde_json::to_string(&success_response)
            .expect("Error serializing auth success response");

          send_message(Message::Text(serialized_response), outgoing.clone())
            .await;
        }
      }
      _ => {
        error!("Invalid authentication message from {}", addr);
        close_connection(outgoing).await;
        return;
      }
    }
  } else {
    error!("No authentication message from {}", addr);
    close_connection(outgoing).await;
    return;
  }

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
              errors::WebsocketError::SerializationError,
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
                errors::WebsocketError::SearchError,
                outgoing.clone(),
              )
              .await;
              continue;
            }
          },
          Err(e) => {
            error!("Error getting search response: {}", e);
            send_error_response(
              errors::WebsocketError::SearchError,
              outgoing.clone(),
            )
            .await;
            continue;
          }
        };

        let search_response: SearchResponse<User> =
          match serde_json::from_str(&response_text) {
            Ok(search_response) => search_response,
            Err(e) => {
              error!("Error deserializing search response: {}", e);
              send_error_response(
                errors::WebsocketError::SerializationError,
                outgoing.clone(),
              )
              .await;
              continue;
            }
          };

        let usernames: Vec<User> = search_response.into_documents().collect();

        let response_msg = serde_json::json!(SearchResult { hits: usernames });

        if let Err(e) = outgoing
          .lock()
          .await
          .send(Message::Text(format!("{}", response_msg.to_string())))
          .await
        {
          error!("Error sending message: {}", e);
          send_error_response(
            errors::WebsocketError::SendError,
            outgoing.clone(),
          )
          .await;
          continue;
        }
      }
      Err(e) => {
        error!("Error in WebSocket message: {}", e);
        send_error_response(
          errors::WebsocketError::InvalidMessage,
          outgoing.clone(),
        )
        .await;
        continue;
      }
      _ => {}
    }
  }

  close_connection(outgoing).await;
}
