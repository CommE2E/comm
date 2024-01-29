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
  SearchQuery, SearchResult, User,
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

async fn send_search_request<T: Serialize>(
  url: &str,
  json_body: T,
) -> Result<reqwest::Response, reqwest::Error> {
  let client = reqwest::Client::new();

  client
    .post(url)
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .json(&json_body)
    .send()
    .await
}

async fn close_connection(outgoing: WebsocketSink) {
  if let Err(e) = outgoing.lock().await.close().await {
    error!("Error closing connection: {}", e);
  }
}

async fn handle_prefix_search(
  prefix: &str,
) -> Result<String, errors::WebsocketError> {
  let prefix_query = Query {
    query: Prefix {
      prefix: Username {
        username: prefix.trim().to_string(),
      },
    },
  };

  let opensearch_url =
    format!("https://{}/users/_search/", &CONFIG.opensearch_endpoint);

  let search_response = send_search_request(&opensearch_url, prefix_query)
    .await?
    .json::<SearchResponse<User>>()
    .await?;

  let usernames: Vec<User> = search_response.into_documents().collect();

  let search_result = serde_json::to_string(&SearchResult { hits: usernames })?;

  Ok(search_result)
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
        send_message(Message::Pong(msg), outgoing.clone()).await;
      }
      Ok(Message::Text(text)) => {
        let Ok(search_request) = serde_json::from_str(&text) else {
          send_error_response(
            errors::WebsocketError::InvalidSearchQuery,
            outgoing.clone(),
          )
          .await;
          continue;
        };

        let search_result = match search_request {
          SearchQuery::Prefix(prefix_request) => {
            handle_prefix_search(&prefix_request.prefix).await
          }
        };

        let response_msg = match search_result {
          Ok(response_msg) => response_msg,
          Err(e) => {
            send_error_response(e, outgoing.clone()).await;
            continue;
          }
        };

        send_message(
          Message::Text(format!("{}", response_msg.to_string())),
          outgoing.clone(),
        )
        .await;
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
