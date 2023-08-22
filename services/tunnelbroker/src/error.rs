#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  TonicError(tonic::transport::Error),
  #[display(...)]
  ClientError(grpc_clients::tonic::Status),
  #[display(...)]
  ServerError(tonic::Status),
  #[display(...)]
  GrpcClient(grpc_clients::error::Error),
  #[display(...)]
  SessionError(crate::websockets::session::SessionError),
  #[display(...)]
  LapinError(lapin::Error),
  #[display(...)]
  SerdeError(serde_json::Error),
}
