use crate::constants::SEARCH_LOG_ERROR_TYPE;

pub type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum WebsocketError {
  InvalidMessage,
  UnauthorizedDevice,
  SearchError,
  AuthError,
  SerializationError,
}

impl From<serde_json::Error> for WebsocketError {
  fn from(err: serde_json::Error) -> Self {
    tracing::error!(
      errorType = SEARCH_LOG_ERROR_TYPE,
      "Error serializing: {}",
      err
    );
    WebsocketError::SerializationError
  }
}

impl From<reqwest::Error> for WebsocketError {
  fn from(err: reqwest::Error) -> Self {
    tracing::error!(
      errorType = SEARCH_LOG_ERROR_TYPE,
      "Error with search request: {}",
      err
    );
    WebsocketError::SearchError
  }
}
