use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  ReqwestError(reqwest::Error),
  InvalidHeaderValue(reqwest::header::InvalidHeaderValue),
  AmqpError(lapin::Error),
  MissingFarcasterToken,
  InvalidRequest,
  DatabaseError(comm_lib::database::Error),
  BlobError(comm_lib::blob::client::BlobServiceError),
  AuthError(comm_lib::auth::AuthServiceError),
  Timeout,
}
