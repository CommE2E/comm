use actix_web::{
  error::{
    ErrorBadRequest, ErrorConflict, ErrorInternalServerError,
    ErrorServiceUnavailable, HttpError,
  },
  HttpResponse, ResponseError,
};
use comm_services_lib::blob::client::BlobServiceError;
use reqwest::StatusCode;
use tracing::{error, trace, warn};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum BackupError {
  BlobError(BlobServiceError),
}

impl From<&BackupError> for actix_web::Error {
  fn from(value: &BackupError) -> Self {
    trace!("Handling backup service error: {value}");
    match value {
      BackupError::BlobError(
        err @ (BlobServiceError::ClientError(_)
        | BlobServiceError::UnexpectedHttpStatus(_)
        | BlobServiceError::ServerError
        | BlobServiceError::UnexpectedError),
      ) => {
        warn!("Transient blob error occurred: {err}");
        ErrorServiceUnavailable("please retry")
      }
      BackupError::BlobError(BlobServiceError::AlreadyExists) => {
        ErrorConflict("blob already exists")
      }
      BackupError::BlobError(BlobServiceError::InvalidArguments) => {
        ErrorBadRequest("bad request")
      }
      BackupError::BlobError(
        err @ (BlobServiceError::URLError(_) | BlobServiceError::NotFound),
      ) => {
        error!("Unexpected blob error: {err}");
        ErrorInternalServerError("server error")
      }
    }
  }
}

impl From<BackupError> for HttpError {
  fn from(value: BackupError) -> Self {
    value.into()
  }
}

impl ResponseError for BackupError {
  fn error_response(&self) -> HttpResponse {
    actix_web::Error::from(self).error_response()
  }

  fn status_code(&self) -> StatusCode {
    actix_web::Error::from(self)
      .as_response_error()
      .status_code()
  }
}
