#![allow(unused)]
use std::ops::RangeInclusive;
use std::sync::Arc;

use async_stream::try_stream;
use chrono::Duration;
use tokio_stream::StreamExt;
use tonic::codegen::futures_core::Stream;
use tracing::{debug, error, trace, warn};

use crate::constants::S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE;
use crate::database::types::{
  BlobItemInput, BlobItemRow, PrimaryKey, UncheckedKind,
};
use crate::database::DBError;
use crate::s3::{Error as S3Error, S3Client, S3Path};
use crate::tools::{BoxedError, MemOps};
use crate::{constants::BLOB_DOWNLOAD_CHUNK_SIZE, database::DatabaseClient};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum BlobServiceError {
  BlobNotFound,
  BlobAlreadyExists,
  InvalidState,
  DB(DBError),
  S3(S3Error),
  InputError(#[error(ignore)] BoxedError),
}

type BlobServiceResult<T> = Result<T, BlobServiceError>;

#[derive(Clone, Debug)]
pub struct BlobServiceConfig {
  /// Blob data is streamed from S3 in chunks of this size.
  pub download_chunk_size: usize,
  /// If enabled, orphaned blobs will be deleted immediately after
  /// last holder is removed. This option should be enabled
  /// if maintenance garbage collection tasks are not run.
  pub instant_delete_orphaned_blobs: bool,
  /// Minimum age that a orphan must stay unmodified
  /// before it can be deleted by a garbage collection task
  /// This option is ignored if `instant_delete_orphaned_blobs` is `true`
  pub orphan_protection_period: chrono::Duration,
}

impl Default for BlobServiceConfig {
  fn default() -> Self {
    BlobServiceConfig {
      download_chunk_size: BLOB_DOWNLOAD_CHUNK_SIZE as usize,
      instant_delete_orphaned_blobs: false,
      orphan_protection_period: Duration::hours(1),
    }
  }
}

#[derive(Clone)]
pub struct BlobService {
  db: Arc<DatabaseClient>,
  s3: S3Client,
  config: BlobServiceConfig,
}

impl BlobService {
  pub fn new(
    db: DatabaseClient,
    s3: S3Client,
    config: BlobServiceConfig,
  ) -> Self {
    Self {
      db: Arc::new(db),
      s3,
      config,
    }
  }
}
