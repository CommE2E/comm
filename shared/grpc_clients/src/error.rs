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
}

impl Error {
  pub fn network_error_aware_display(&self) -> String {
    match self {
      Self::TransportError(_) => "network_error".to_string(),
      other_err => other_err.to_string(),
    }
  }
}

pub fn unsupported_version() -> Status {
  Status::unimplemented("unsupported_version")
}

pub fn is_version_unsupported(status: &Status) -> bool {
  status.code() == Code::Unimplemented
    && status.message() == "unsupported_version"
}
