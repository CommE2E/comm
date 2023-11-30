use tonic::{codegen::http::uri::InvalidUri, Code, Status};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(fmt = "Transport Error: {:?}", _0)]
  TransportError(tonic::transport::Error),
  #[display(fmt = "Invalid Uri: {:?}", _0)]
  InvalidUri(InvalidUri),
  #[display(fmt = "Grpc Status: {:?}", _0)]
  GrpcStatus(Status),
  #[display(fmt = "Invalid Device Type")]
  InvalidDeviceType,
  #[display(fmt = "Cookie Error: {}", _0)]
  CookieError(CookieError),
}

pub fn unsupported_version() -> Status {
  Status::unimplemented("Unsupported version")
}

pub fn is_version_unsupported(status: &Status) -> bool {
  status.code() == Code::Unimplemented
    && status.message() == "Unsupported version"
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
pub struct CookieError {
  message: String,
}

impl CookieError {
  pub fn new(message: &str) -> CookieError {
    CookieError {
      message: message.to_string(),
    }
  }
}
