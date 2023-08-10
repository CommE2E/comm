#![allow(unused)]

use derive_more::{Display, Error, From};
use tracing::debug;

// publicly re-export some reqwest types
pub use reqwest::Error as ReqwestError;
pub use reqwest::StatusCode;

#[derive(From, Error, Debug, Display)]
pub enum BlobServiceError {
  /// HTTP Client errors, this includes:
  /// - connection failures
  /// - request errors (e.g. upload input stream)
  #[display(...)]
  ClientError(ReqwestError),
  /// Invalid Blob service URL provided
  #[display(...)]
  URLError(#[error(ignore)] String),
  /// Blob service returned HTTP 404
  /// - blob or holder not found
  #[display(...)]
  NotFound,
  /// Blob service returned HTTP 409
  /// - blob or holder already exists
  #[display(...)]
  AlreadyExists,
  /// Blob service returned HTTP 400
  /// - invalid holder or blob_hash format
  #[display(...)]
  InvalidArguments,
  /// Blob service returned HTTP 50x
  #[display(...)]
  ServerError,
  #[display(...)]
  UnexpectedHttpStatus(#[error(ignore)] reqwest::StatusCode),
}

/// A client interface to Blob service.
//
/// The `BlobServiceClient` holds a connection pool internally, so it is advised that
/// you create one and **reuse** it, by **cloning**.
///
/// You should **not** wrap the `BlobServiceClient` in an `Rc` or `Arc` to **reuse** it,
/// because it already uses an `Arc` internally.
#[derive(Clone)]
pub struct BlobServiceClient {
  http_client: reqwest::Client,
  blob_service_url: reqwest::Url,
}

impl BlobServiceClient {
  pub fn new(blob_service_url: reqwest::Url) -> Self {
    debug!("Creating BlobServiceClient. URL: {}", blob_service_url);
    Self {
      http_client: reqwest::Client::new(),
      blob_service_url,
    }
  }
}
