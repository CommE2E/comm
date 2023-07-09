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

  /// Retrieves blob object metadta and returns a download object
  /// that can be used to download the blob data.
  pub async fn create_download(
    &self,
    blob_hash: impl Into<String>,
  ) -> BlobServiceResult<BlobDownloadObject> {
    // 1. Get S3 path
    let s3_path = match self.db.get_blob_item(blob_hash.into()).await {
      Ok(Some(BlobItemRow { s3_path, .. })) => Ok(s3_path),
      Ok(None) => {
        debug!("Blob not found");
        Err(BlobServiceError::BlobNotFound)
      }
      Err(err) => Err(BlobServiceError::DB(err)),
    }?;
    debug!("S3 path: {:?}", s3_path);

    // 2. Get S3 Object metadata
    trace!("Getting S3 object metadata...");
    let object_metadata = self.s3.get_object_metadata(&s3_path).await?;
    let blob_size: u64 =
      object_metadata.content_length().try_into().map_err(|err| {
        error!("Failed to parse S3 object content length: {:?}", err);
        BlobServiceError::InvalidState
      })?;
    debug!("S3 object size: {} bytes", blob_size);

    // 3. Create download session
    let session = BlobDownloadObject {
      s3_path,
      blob_size,
      byte_range: 0..=blob_size - 1,
      chunk_size: self.config.download_chunk_size as u64,
      s3_client: self.s3.clone(),
    };
    Ok(session)
  }
}

pub struct BlobDownloadObject {
  /// Size of the whole blob object in bytes.
  pub blob_size: u64,
  /// Range of bytes to be downloaded.
  pub byte_range: RangeInclusive<u64>,
  chunk_size: u64,
  s3_client: S3Client,
  s3_path: S3Path,
}

impl BlobDownloadObject {
  pub fn set_byte_range(&mut self, range: RangeInclusive<u64>) {
    let (start, end) = range.into_inner();
    let first_byte = std::cmp::max(start, 0);
    let last_byte = std::cmp::min(end, self.blob_size - 1);
    self.byte_range = first_byte..=last_byte;
    debug!("Requested byte range: {}..={}", first_byte, last_byte);
  }

  /// Size of the data to be downloaded in bytes.
  pub fn download_size(&self) -> u64 {
    self.byte_range.end() - self.byte_range.start() + 1
  }

  pub fn into_stream(self) -> impl Stream<Item = BlobServiceResult<Vec<u8>>> {
    let BlobDownloadObject {
      byte_range,
      chunk_size,
      s3_path,
      s3_client,
      ..
    } = self;
    let (first_byte, last_byte) = byte_range.into_inner();

    try_stream! {
      trace!("Starting download stream");
      let mut offset: u64 = first_byte;
      while offset < last_byte {
        let next_size = std::cmp::min(chunk_size, last_byte - offset + 1);
        let range = offset..(offset + next_size);
        trace!(?range, "Getting {} bytes of data", next_size);

        yield s3_client
          .get_object_bytes(&s3_path, range)
          .await?;

        offset += chunk_size;
      }
    }
  }
}
