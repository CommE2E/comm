use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  Reqwest(reqwest::Error),
  SerdeJson(serde_json::Error),
  #[display(fmt = "Token not found in response")]
  TokenNotFound,
  #[display(fmt = "Expiry time not found in response")]
  ExpiryNotFound,
  #[display(fmt = "Failed to acquire read lock")]
  ReadLock,
  #[display(fmt = "Failed to acquire write lock")]
  WriteLock,
  #[display(fmt = "WNS Notification Error: {}", _0)]
  WNSNotification(WNSNotificationError),
  #[display(fmt = "Missing WNS ID")]
  MissingWNSID,
}

#[derive(Debug, Display)]
pub enum WNSNotificationError {
  #[display(fmt = "HTTP Error: {}", _0)]
  Http(reqwest::Error),
  #[display(fmt = "Unknown Error: {}", _0)]
  Unknown(String),
}

impl std::error::Error for WNSNotificationError {}
