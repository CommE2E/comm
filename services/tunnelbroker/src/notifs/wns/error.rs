use derive_more::{Display, Error, From};

use super::response::WNSErrorResponse;

#[derive(Debug, From, Display, Error)]
pub enum Error {
  Reqwest(reqwest::Error),
  SerdeJson(serde_json::Error),
  #[display(fmt = "WNS Token Error: {}", _0)]
  WNSToken(WNSTokenError),
  #[display(fmt = "Failed to acquire read lock")]
  ReadLock,
  #[display(fmt = "Failed to acquire write lock")]
  WriteLock,
  #[display(fmt = "WNS Notification Error: {}", _0)]
  WNSNotification(WNSErrorResponse),
}

#[derive(Debug, From, Display)]
pub enum WNSTokenError {
  #[display(fmt = "Token not found in response")]
  TokenNotFound,
  #[display(fmt = "Expiry time not found in response")]
  ExpiryNotFound,
  #[display(fmt = "Unknown Error: {}", _0)]
  Unknown(String),
}

impl std::error::Error for WNSTokenError {}
