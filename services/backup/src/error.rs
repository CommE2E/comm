use actix_web::{
  error::{
    ErrorBadRequest, ErrorConflict, ErrorInternalServerError, ErrorNotFound,
    ErrorServiceUnavailable, HttpError,
  },
  HttpResponse, ResponseError,
};
pub use aws_sdk_dynamodb::Error as DynamoDBError;
use comm_lib::database::Error as DBError;
use comm_lib::{auth::AuthServiceError, blob::client::BlobServiceError};
use grpc_clients::error::Error as IdentityError;
use reqwest::StatusCode;
use tracing::{error, trace, warn};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum BackupError {
  NoBackup,
  NoUserID,
  BlobError(BlobServiceError),
  AuthError(AuthServiceError),
  DB(comm_lib::database::Error),
  IdentityError(IdentityError),
  BadRequest,
}

impl From<&BackupError> for actix_web::Error {
  fn from(value: &BackupError) -> Self {
    trace!("Handling backup service error: {value}");
    match value {
      BackupError::NoBackup => ErrorNotFound("not found"),
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
      BackupError::AuthError(err) => {
        error!("Unexpected auth error: {err}");
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
      BackupError::IdentityError(err) => {
        warn!("Transient identity error occurred: {err}");
        ErrorServiceUnavailable("please retry")
      }
      BackupError::NoUserID => ErrorBadRequest("bad request"),
      BackupError::BadRequest => ErrorBadRequest("bad request"),
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
