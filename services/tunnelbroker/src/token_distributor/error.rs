use comm_lib::database::Error;
use std::fmt;

#[derive(Debug)]
pub enum TokenConnectionError {
  WebSocketConnection(tokio_tungstenite::tungstenite::Error),
  AuthenticationFailed(String),
  WebSocketClosed(String),
  StreamEnded,
  DatabaseError(Error),
  TokenOwnershipLost,
  HeartbeatFailed(String),
  PingTimeout,
  Cancelled,
}

impl fmt::Display for TokenConnectionError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      TokenConnectionError::WebSocketConnection(e) => {
        write!(f, "WebSocket connection error: {}", e)
      }
      TokenConnectionError::AuthenticationFailed(msg) => {
        write!(f, "Authentication failed: {}", msg)
      }
      TokenConnectionError::WebSocketClosed(reason) => {
        write!(f, "WebSocket closed: {}", reason)
      }
      TokenConnectionError::StreamEnded => {
        write!(f, "WebSocket stream ended unexpectedly")
      }
      TokenConnectionError::DatabaseError(e) => {
        write!(f, "Database error: {}", e)
      }
      TokenConnectionError::TokenOwnershipLost => {
        write!(f, "Token ownership lost to another instance")
      }
      TokenConnectionError::HeartbeatFailed(msg) => {
        write!(f, "Heartbeat failed: {}", msg)
      }
      TokenConnectionError::PingTimeout => {
        write!(f, "Ping timeout - connection appears dead")
      }
      TokenConnectionError::Cancelled => write!(f, "Connection cancelled"),
    }
  }
}

impl std::error::Error for TokenConnectionError {
  fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
    match self {
      TokenConnectionError::WebSocketConnection(e) => Some(e),
      TokenConnectionError::DatabaseError(e) => Some(e),
      _ => None,
    }
  }
}

impl From<tokio_tungstenite::tungstenite::Error> for TokenConnectionError {
  fn from(error: tokio_tungstenite::tungstenite::Error) -> Self {
    TokenConnectionError::WebSocketConnection(error)
  }
}

impl From<Error> for TokenConnectionError {
  fn from(error: Error) -> Self {
    TokenConnectionError::DatabaseError(error)
  }
}
