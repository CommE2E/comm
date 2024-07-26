use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  Jwt,
  WebPush(web_push::WebPushError),
  SerdeJson(serde_json::Error),
}

impl From<jsonwebtoken::errors::Error> for Error {
  fn from(_: jsonwebtoken::errors::Error) -> Self {
    Self::Jwt
  }
}
