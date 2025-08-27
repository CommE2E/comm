use comm_lib::database::Error as DBError;

#[derive(Debug, derive_more::Display)]
pub enum TokenConnectionError {
  #[display(fmt = "WebSocket connection error: {}", _0)]
  WebSocketConnection(tokio_tungstenite::tungstenite::Error),
  #[display(fmt = "Authentication failed: {}", _0)]
  AuthenticationFailed(String),
  #[display(fmt = "WebSocket closed: {}", _0)]
  WebSocketClosed(String),
  #[display(fmt = "WebSocket stream ended unexpectedly")]
  StreamEnded,
  #[display(fmt = "Database error:: {}", _0)]
  DatabaseError(DBError),
  #[display(fmt = "Token ownership lost to another instance")]
  TokenOwnershipLost,
  #[display(fmt = "Heartbeat failed: {}", _0)]
  HeartbeatFailed(String),
  #[display(fmt = "Ping timeout - connection appears dead")]
  PingTimeout,
  #[display(fmt = "Connection cancelled")]
  Cancelled,
  #[display(fmt = "AMQP setup failed: {}", _0)]
  AmqpSetupFailed(String),
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

impl From<DBError> for TokenConnectionError {
  fn from(error: DBError) -> Self {
    TokenConnectionError::DatabaseError(error)
  }
}
