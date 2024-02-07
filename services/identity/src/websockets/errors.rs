use tracing::error;

pub type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum WebsocketError {
  InvalidMessage,
  UnauthorizedDevice,
  SendError,
  SearchError,
  AuthError,
  SerializationError,
}

impl From<serde_json::Error> for WebsocketError {
  fn from(err: serde_json::Error) -> Self {
    tracing::error!("Error serializing: {}", err);
    WebsocketError::SerializationError
  }
}

impl From<reqwest::Error> for WebsocketError {
  fn from(err: reqwest::Error) -> Self {
    tracing::error!("Error with search request: {}", err);
    WebsocketError::SearchError
  }
}
