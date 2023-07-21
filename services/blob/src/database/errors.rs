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
  #[from(ignore)]
  Blob(BlobDBError),
  #[display(...)]
  ItemAlreadyExists,
}

#[derive(Debug)]
pub enum BlobDBError {
  HolderAlreadyExists(String),
  InvalidS3Path(S3PathError),
  InvalidInput(String),
}

impl Display for BlobDBError {
  fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
    match self {
      BlobDBError::HolderAlreadyExists(holder) => {
        write!(f, "Item for given holder [{}] already exists", holder)
      }
      BlobDBError::InvalidS3Path(err) => err.fmt(f),
      BlobDBError::InvalidInput(value) => {
        write!(f, "Invalid input value [{}]", value)
      }
    }
  }
}

impl std::error::Error for BlobDBError {}

impl From<S3PathError> for Error {
  fn from(err: S3PathError) -> Self {
    Error::Blob(BlobDBError::InvalidS3Path(err))
  }
}
