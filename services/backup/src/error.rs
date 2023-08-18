use actix_web::{
  error::{
    ErrorBadRequest, ErrorConflict, ErrorInternalServerError, ErrorNotFound,
    ErrorServiceUnavailable, HttpError,
  },
  HttpResponse, ResponseError,
};
pub use aws_sdk_dynamodb::Error as DynamoDBError;
use comm_services_lib::blob::client::BlobServiceError;
use comm_services_lib::database::Error as DBError;
use reqwest::StatusCode;
use tracing::{error, trace, warn};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum BackupError {
  NoBackup,
  BlobError(BlobServiceError),
  DB(comm_services_lib::database::Error),
}

impl From<&BackupError> for actix_web::Error {
  fn from(value: &BackupError) -> Self {
    trace!("Handling backup service error: {value}");
    match value {
      BackupError::NoBackup => ErrorNotFound("not found"),
      BackupError::BlobError(
        err @ (BlobServiceError::ClientError(_)
        | BlobServiceError::UnexpectedHttpStatus(_)
        | BlobServiceError::ServerError),
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
      BackupError::DB(err) => match err {
        DBError::AwsSdk(
          err @ (DynamoDBError::InternalServerError(_)
          | DynamoDBError::ProvisionedThroughputExceededException(_)
          | DynamoDBError::RequestLimitExceeded(_)),
        ) => {
          warn!("AWS transient error occurred: {err}");
          ErrorServiceUnavailable("please retry")
        }
        unexpected => {
          error!("Received an unexpected DB error: {0:?} - {0}", unexpected);
          ErrorInternalServerError("server error")
        }
      },
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
