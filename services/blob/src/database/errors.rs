use std::fmt::{Display, Formatter};

use aws_sdk_dynamodb::Error as DynamoDBError;
use comm_services_lib::database::DBItemError;

use crate::s3::S3PathError;

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  AwsSdk(DynamoDBError),
  #[display(...)]
  Attribute(DBItemError),
  #[display(...)]
  Blob(BlobDBError),
  #[display(...)]
  ItemAlreadyExists,
}

#[derive(Debug)]
pub enum BlobDBError {
  HolderAlreadyExists(String),
  InvalidS3Path(S3PathError),
}

impl Display for BlobDBError {
  fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
    match self {
      BlobDBError::HolderAlreadyExists(holder) => {
        write!(f, "Item for given holder [{}] already exists", holder)
      }
      BlobDBError::InvalidS3Path(err) => err.fmt(f),
    }
  }
}

impl std::error::Error for BlobDBError {}
