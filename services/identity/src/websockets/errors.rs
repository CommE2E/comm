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
