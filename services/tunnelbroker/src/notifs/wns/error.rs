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
}
