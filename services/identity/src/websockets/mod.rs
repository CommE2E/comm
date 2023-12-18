use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;

use elastic::client::responses::SearchResponse;
use futures_util::{SinkExt, StreamExt};
use hyper::{Body, Request, Response, StatusCode};
use hyper_tungstenite::tungstenite::Message;
use hyper_tungstenite::HyperWebsocket;
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tracing::{debug, error, info};

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

type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

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

async fn send_request(
  url: &str,
  json_body: String,
) -> Result<reqwest::Response, String> {
  let client = reqwest::Client::new();

  client
    .post(url)
    .header(reqwest::header::CONTENT_TYPE, "application/json")
    .body(json_body)
    .send()
    .await
    .map_err(|err| {
      format!("failed to update identity-search index, err: {}", err)
    })
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

  let (mut outgoing, mut incoming) = ws_stream.split();

  let opensearch_endpoint = std::env::var("OPENSEARCH_ENDPOINT")
    .unwrap_or_else(|_| "localhost:9200".to_string());
  debug!("OPENSEARCH_ENDPOINT: {}", opensearch_endpoint);

  let opensearch_url =
    format!("https://{}/users/_search/", opensearch_endpoint);

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
        if let Err(e) = outgoing.send(Message::Pong(msg)).await {
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

        let json_body = serde_json::to_string(&prefix_query)
          .expect("Failed to serialize prefix query");

        let response = send_request(&opensearch_url, json_body).await;

        let response_text = response
          .expect("Failed to get search response")
          .text()
          .await
          .expect("Failed to get response text");

        let search_response =
          serde_json::from_str::<SearchResponse<User>>(&response_text)
            .expect("Failed to deserialize search response");

        let usernames: Vec<String> = search_response
          .hits()
          .map(|hit| {
            let user = hit.document().expect("Failed to get document");

            serde_json::to_string(&user).expect("Failed to serialize user")
          })
          .collect();

        let response_msg = serde_json::json!({
          "action": "searchResults",
          "results": usernames
        });

        if let Err(e) = outgoing
          .send(Message::Text(format!("{}", response_msg.to_string())))
          .await
        {
          error!("Error sending message: {}", e);
          break;
        }
      }
      Err(e) => {
        error!("Error in WebSocket message: {}", e);
        break;
      }
      _ => {}
    }
  }

  if let Err(e) = outgoing.close().await {
    error!("Failed to close WebSocket connection: {}", e);
  }
}
