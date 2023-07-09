#![allow(unused)]
use std::ops::{Bound, Range, RangeBounds, RangeInclusive};
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
use crate::tools::{BoxedError, ByteStream, MemOps};
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
      byte_range: 0..blob_size,
      chunk_size: self.config.download_chunk_size as u64,
      s3_client: self.s3.clone(),
    };
    Ok(session)
  }

  pub async fn put_blob(
    &self,
    blob_hash: impl Into<String>,
    mut blob_data_stream: impl ByteStream,
  ) -> Result<(), BlobServiceError> {
    let blob_hash: String = blob_hash.into();
    let blob_item = BlobItemInput::new(&blob_hash);

    if self.db.get_blob_item(blob_hash).await?.is_some() {
      debug!("Blob already exists");
      return Err(BlobServiceError::BlobAlreadyExists);
    }

    let mut upload_session =
      self.s3.start_upload_session(&blob_item.s3_path).await?;
    trace!(?blob_item, "Started S3 upload session");

    tokio::pin!(blob_data_stream);
    let mut s3_chunk: Vec<u8> = Vec::new();
    while let Some(mut chunk) =
      blob_data_stream.try_next().await.map_err(|err| {
        warn!("Failed to get data chunk: {:?}", err);
        BlobServiceError::InputError(err)
      })?
    {
      s3_chunk.append(&mut chunk);

      // New parts should be added to AWS only if they exceed minimum part size,
      // Otherwise AWS returns error
      if s3_chunk.len() as u64 > S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE {
        trace!(
          chunk_size = s3_chunk.len(),
          "Chunk size exceeded, adding new S3 part"
        );
        upload_session
          .add_part(s3_chunk.take_out())
          .await
          .map_err(BlobServiceError::from)?;
      }
    }
    trace!("Upload stream drained");
    // add the remaining data as the last S3 part
    if !s3_chunk.is_empty() {
      trace!("Uploading remaining {} bytes", s3_chunk.len());
      upload_session.add_part(s3_chunk).await?;
    }
    // Complete the upload session
    upload_session.finish_upload().await?;

    trace!("S3 upload complete, putting item to db");
    self.db.put_blob_item(blob_item).await?;
    Ok(())
  }

  pub async fn assign_holder(
    &self,
    blob_hash: impl Into<String>,
    holder: impl Into<String>,
  ) -> BlobServiceResult<bool> {
    let blob_hash: String = blob_hash.into();
    trace!(blob_hash, "Attempting to assign holder");
    self
      .db
      .put_holder_assignment(blob_hash.clone(), holder.into())
      .await?;

    trace!("Holder assigned. Checking if data exists");
    let data_exists = self.db.get_blob_item(blob_hash).await?.is_some();
    Ok(data_exists)
  }

  pub async fn revoke_holder(
    &self,
    blob_hash: impl Into<String>,
    holder: impl Into<String>,
  ) -> BlobServiceResult<()> {
    let blob_hash: String = blob_hash.into();
    let holder: String = holder.into();

    trace!(blob_hash, holder, "Attempting to revoke holder");
    self.db.delete_holder_assignment(&blob_hash, holder).await?;

    if self.config.instant_delete_orphaned_blobs {
      trace!("Instant orphan deletion enabled. Looking for holders");
      let is_orphan = self
        .db
        .list_blob_holders(&blob_hash, Some(1))
        .await?
        .is_empty();
      if !is_orphan {
        trace!("Found holders, nothing to do");
        return Ok(());
      }

      debug!("No holders left, deleting blob if exists");
      trace!("Getting blob item");
      let Some(blob_item) = self.db.get_blob_item(&blob_hash).await? else {
        trace!("Blob item not found, nothing to do");
        return Ok(())
      };

      trace!("Deleting S3 object");
      self.s3.delete_object(&blob_item.s3_path).await?;
      trace!("Deleting blob item entry from DB");
      self.db.delete_blob_item(blob_hash).await?;
    }
    Ok(())
  }
}

pub struct BlobDownloadObject {
  /// Size of the whole blob object in bytes.
  pub blob_size: u64,
  /// Range of bytes to be downloaded (exclusive end).
  byte_range: Range<u64>,
  chunk_size: u64,
  s3_client: S3Client,
  s3_path: S3Path,
}

impl BlobDownloadObject {
  pub fn set_byte_range(&mut self, range: impl RangeBounds<u64>) {
    let range_start = match range.start_bound() {
      Bound::Included(&start) => start,
      Bound::Excluded(&start) => start + 1,
      Bound::Unbounded => 0,
    };
    let range_end = match range.end_bound() {
      Bound::Included(&end) => end + 1,
      Bound::Excluded(&end) => end,
      Bound::Unbounded => self.blob_size,
    };
    // Clamp range to blob size
    let start = std::cmp::max(range_start, 0);
    let end_exclusive = std::cmp::min(range_end, self.blob_size);

    self.byte_range = start..end_exclusive;
    debug!("Requested byte range: {}..{}", start, end_exclusive);
  }

  /// Size of the data to be downloaded in bytes.
  pub fn download_size(&self) -> u64 {
    self.byte_range.end - self.byte_range.start
  }

  pub fn into_stream(self) -> impl Stream<Item = BlobServiceResult<Vec<u8>>> {
    let BlobDownloadObject {
      byte_range,
      chunk_size,
      s3_path,
      s3_client,
      ..
    } = self;

    try_stream! {
      trace!("Starting download stream");
      let mut offset: u64 = byte_range.start;
      while offset < byte_range.end {
        let next_size = std::cmp::min(chunk_size, byte_range.end - offset);
        let range = offset..(offset + next_size);
        trace!(?range, "Getting {} bytes of data", next_size);

        yield s3_client
          .get_object_bytes(&s3_path, range)
          .await?;

        offset += next_size;
      }
    }
  }
}
