use tonic::{codegen::http::uri::InvalidUri, Status};

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
