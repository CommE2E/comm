use derive_more::{Display, Error, From};

#[derive(Debug, From, Display, Error)]
pub enum Error {
  ReqwestError(reqwest::Error),
  InvalidHeaderValue(reqwest::header::InvalidHeaderValue),
  MissingFarcasterToken,
  InvalidRequest,
  DatabaseError(comm_lib::database::Error),
}
