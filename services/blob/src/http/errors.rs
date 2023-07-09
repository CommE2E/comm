use actix_web::error::{
  ErrorBadRequest, ErrorConflict, ErrorInternalServerError, ErrorNotFound,
  ErrorServiceUnavailable,
};
use actix_web::{Error as HttpError, HttpResponse, ResponseError};
use aws_sdk_dynamodb::Error as DynamoDBError;
use http::StatusCode;
use tracing::{debug, error, trace, warn};

use crate::database::errors::{BlobDBError, Error as DBError};
use crate::s3::Error as S3Error;
use crate::service::BlobServiceError;

pub(super) fn handle_blob_service_error(err: &BlobServiceError) -> HttpError {
  trace!("Handling blob service error: {:?}", err);
  match err {
    BlobServiceError::BlobNotFound => ErrorNotFound("not found"),
    BlobServiceError::BlobAlreadyExists
    | BlobServiceError::DB(DBError::ItemAlreadyExists) => {
      ErrorConflict("blob already exists")
    }
    BlobServiceError::DB(db_err) => match db_err {
      DBError::AwsSdk(DynamoDBError::InternalServerError(_))
      | DBError::AwsSdk(
        DynamoDBError::ProvisionedThroughputExceededException(_),
      )
      | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
        warn!("AWS transient error occurred");
        ErrorServiceUnavailable("please retry")
      }
      DBError::Blob(BlobDBError::InvalidInput(_)) => {
        ErrorBadRequest("bad request")
      }
      unexpected => {
        error!("Received an unexpected DB error: {0:?} - {0}", unexpected);
        ErrorInternalServerError("server error")
      }
    },
    BlobServiceError::S3(s3_err) => match s3_err {
      S3Error::AwsSdk(aws_sdk_s3::Error::NotFound(_))
      | S3Error::AwsSdk(aws_sdk_s3::Error::NoSuchKey(_)) => {
        error!("Data inconsistency! Blob is present in database but not present in S3!");
        ErrorInternalServerError("server error")
      }
      S3Error::EmptyUpload => ErrorBadRequest("empty upload"),
      unexpected => {
        error!("Received an unexpected S3 error: {0:?} - {0}", unexpected);
        ErrorInternalServerError("server error")
      }
    },
    BlobServiceError::InputError(err) => {
      debug!("Received request input error: {0:?} - {0}", err);
      ErrorBadRequest("bad request")
    }
    err => {
      error!("Received an unexpected error: {0:?} - {0}", err);
      ErrorInternalServerError("server error")
    }
  }
}

/// This allow us to `await?` blob service calls in HTTP handlers
impl ResponseError for BlobServiceError {
  fn error_response(&self) -> HttpResponse {
    handle_blob_service_error(self).error_response()
  }

  fn status_code(&self) -> StatusCode {
    handle_blob_service_error(self)
      .as_response_error()
      .status_code()
  }
}
