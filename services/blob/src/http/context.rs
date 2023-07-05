use crate::database::errors::Error as DBError;
use crate::database::old::{BlobItem, DatabaseClient, ReverseIndexItem};
use crate::s3::{Error as S3Error, S3Client, S3Path};
use actix_web::error::{
  ErrorBadRequest, ErrorInternalServerError, ErrorNotFound,
  ErrorServiceUnavailable,
};
use actix_web::Error as HttpError;
use anyhow::Result;
use aws_sdk_dynamodb::Error as DynamoDBError;
use tracing::{debug, error, warn};

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
