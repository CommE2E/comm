use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  JWTError,
}

impl From<jsonwebtoken::errors::Error> for Error {
  fn from(_: jsonwebtoken::errors::Error) -> Self {
    Self::JWTError
  }
}
