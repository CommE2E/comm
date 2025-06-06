use actix_web::error::{
  ErrorBadRequest, ErrorConflict, ErrorInternalServerError, ErrorNotFound,
  ErrorServiceUnavailable,
};
use actix_web::{Error as HttpError, HttpResponse, ResponseError};
use aws_sdk_dynamodb::Error as DynamoDBError;
use http::StatusCode;
use tracing::{debug, error, trace, warn};

use crate::constants::error_types;
use crate::database::errors::{BlobDBError, Error as DBError};
use crate::s3::Error as S3Error;
use crate::service::{BlobServiceError, InviteLinkError};

pub(super) fn handle_blob_service_error(err: &BlobServiceError) -> HttpError {
  trace!("Handling blob service error: {:?}", err);
  match err {
    BlobServiceError::BlobNotFound => ErrorNotFound("not found"),
    BlobServiceError::BlobAlreadyExists
    | BlobServiceError::DB(DBError::ItemAlreadyExists) => {
      ErrorConflict("blob already exists")
    }
    BlobServiceError::DB(db_err) => match db_err {
      DBError::AwsSdk(aws_err) => match aws_err.as_ref() {
        DynamoDBError::InternalServerError(_)
        | DynamoDBError::ProvisionedThroughputExceededException(_)
        | DynamoDBError::RequestLimitExceeded(_) => {
          warn!("AWS transient error occurred");
          ErrorServiceUnavailable("please retry")
        }
        unexpected => {
          error!(
            errorType = error_types::OTHER_ERROR,
            "Received an unexpected AWS error: {0:?} - {0}", unexpected
          );
          ErrorInternalServerError("server error")
        }
      },
      DBError::Blob(BlobDBError::InvalidInput(_)) => {
        ErrorBadRequest("bad request")
      }
      unexpected => {
        error!(
          errorType = error_types::DDB_ERROR,
          "Received an unexpected DB error: {0:?} - {0}", unexpected
        );
        ErrorInternalServerError("server error")
      }
    },
    BlobServiceError::S3(s3_err) => match s3_err {
      s3_error if s3_error.is_s3_object_not_found() => {
        error!(
            errorType = error_types::S3_ERROR,
            "Data inconsistency! Blob is present in database but not present in S3!"
          );
        ErrorInternalServerError("server error")
      }
      S3Error::AwsSdk(aws_err) => {
        error!(
          errorType = error_types::S3_ERROR,
          "Received an unexpected AWS S3 error: {0:?} - {0}",
          aws_err.as_ref()
        );
        ErrorInternalServerError("server error")
      }
      S3Error::EmptyUpload => ErrorBadRequest("empty upload"),
      unexpected => {
        error!(
          errorType = error_types::S3_ERROR,
          "Received an unexpected S3 error: {0:?} - {0}", unexpected
        );
        ErrorInternalServerError("server error")
      }
    },
    BlobServiceError::InputError(err) => {
      debug!("Received request input error: {0:?} - {0}", err);
      ErrorBadRequest("bad request")
    }
    BlobServiceError::InviteLinkError(invite_link_error) => {
      match invite_link_error {
        InviteLinkError::Offensive => {
          tracing::info!("Rejected offensive name.");
          ErrorBadRequest("offensive_words")
        }
        _ => {
          warn!("Received invite link error: {0:?}", invite_link_error);
          ErrorBadRequest("bad request")
        }
      }
    }
    err => {
      error!(
        errorType = error_types::OTHER_ERROR,
        "Received an unexpected error: {0:?} - {0}", err
      );
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
