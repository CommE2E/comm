use crate::database::ReverseIndexItem;
use crate::database::{BlobItem, DatabaseClient, Error as DBError};
use crate::s3::{S3Client, S3Path};
use actix_web::error::{
  ErrorInternalServerError, ErrorNotFound, ErrorServiceUnavailable,
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
  #[allow(dead_code)]
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

  #[allow(dead_code)]
  pub async fn find_s3_path_by_holder(
    &self,
    holder: &str,
  ) -> Result<S3Path, HttpError> {
    match self.db.find_reverse_index_by_holder(holder).await {
      Ok(Some(reverse_index)) => {
        self.find_s3_path_by_reverse_index(&reverse_index).await
      }
      Ok(None) => {
        debug!("No db entry found for holder {:?}", holder);
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
