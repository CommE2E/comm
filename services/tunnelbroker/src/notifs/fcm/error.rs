use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  JWTError,
  ReqwestError(reqwest::Error),
  InvalidHeaderValue(reqwest::header::InvalidHeaderValue),
  SerdeJson(serde_json::Error),
  FCMTokenNotInitialized,
}

impl From<jsonwebtoken::errors::Error> for Error {
  fn from(_: jsonwebtoken::errors::Error) -> Self {
    Self::JWTError
  }
}
