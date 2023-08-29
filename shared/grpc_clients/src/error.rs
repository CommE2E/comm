use tonic::{codegen::http::uri::InvalidUri, Status};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  TransportError(tonic::transport::Error),
  #[display(...)]
  InvalidUri(InvalidUri),
  #[display(...)]
  GrpcStatus(Status),
}
