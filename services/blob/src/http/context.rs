use crate::database::errors::{BlobDBError, Error as DBError};
use crate::database::old::{BlobItem, DatabaseClient, ReverseIndexItem};
use crate::s3::{Error as S3Error, S3Client, S3Path};
use crate::service::BlobServiceError;
use actix_web::error::{
  ErrorBadRequest, ErrorConflict, ErrorInternalServerError, ErrorNotFound,
  ErrorServiceUnavailable,
};
use actix_web::{Error as HttpError, HttpResponse, ResponseError};
use anyhow::Result;
use aws_sdk_dynamodb::Error as DynamoDBError;
use http::StatusCode;
use tracing::{debug, error, trace, warn};

/// This structure is passed to every HTTP request handler
/// It should be cloneable because each HTTP worker thread receives a copy
#[derive(Clone)]
pub struct AppContext {
  pub db: DatabaseClient,
  pub s3: S3Client,
}

impl AppContext {
  pub async fn find_s3_path_by_reverse_index(
    &self,
    reverse_index_item: &ReverseIndexItem,
  ) -> Result<S3Path, HttpError> {
    let blob_hash = &reverse_index_item.blob_hash;
    match self.db.find_blob_item(&blob_hash).await {
      Ok(Some(BlobItem { s3_path, .. })) => Ok(s3_path),
      Ok(None) => {
        debug!("No blob found for {:?}", reverse_index_item);
        Err(ErrorNotFound("blob not found"))
      }
      Err(err) => Err(handle_db_error(err)),
    }
  }
}

pub fn handle_db_error(db_error: DBError) -> HttpError {
  match db_error {
    DBError::AwsSdk(DynamoDBError::InternalServerError(_))
    | DBError::AwsSdk(DynamoDBError::ProvisionedThroughputExceededException(
      _,
    ))
    | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
      warn!("AWS transient error occurred");
      ErrorServiceUnavailable("please retry")
    }
    DBError::Blob(blob_err) => {
      error!("Encountered Blob database error: {}", blob_err);
      ErrorInternalServerError("Internal error")
    }
    err => {
      error!("Encountered an unexpected error: {}", err);
      ErrorInternalServerError("unexpected error")
    }
  }
}

pub fn handle_s3_error(s3_error: S3Error) -> HttpError {
  match s3_error {
    S3Error::EmptyUpload => {
      warn!("Empty upload. Aborting");
      ErrorBadRequest("Empty upload")
    }
    err => {
      error!("Encountered S3 error: {:?}", err);
      ErrorInternalServerError("Internal error")
    }
  }
}

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
