#![allow(unused)]
use comm_lib::blob::types::BlobInfo;
use regex::RegexSet;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::ops::{Bound, Range, RangeBounds, RangeInclusive};
use std::sync::Arc;

use async_stream::try_stream;
use chrono::Duration;
use comm_lib::http::ByteStream;
use comm_lib::shared::reserved_users::RESERVED_USERNAME_SET;
use comm_lib::tools::BoxedError;
use once_cell::sync::Lazy;
use tokio_stream::StreamExt;
use tonic::codegen::futures_core::Stream;
use tracing::{debug, error, info, trace, warn};

use crate::config::{CONFIG, OFFENSIVE_INVITE_LINKS};
use crate::constants::{
  INVITE_LINK_BLOB_HASH_PREFIX, S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE,
};
use crate::database::types::{
  BlobItemInput, BlobItemRow, PrimaryKey, UncheckedKind,
};
use crate::database::DBError;
use crate::s3::{Error as S3Error, S3Client, S3Path};
use crate::tools::MemOps;
use crate::{
  constants::error_types, constants::BLOB_DOWNLOAD_CHUNK_SIZE,
  database::DatabaseClient,
};

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum InviteLinkError {
  Reserved,
  Offensive,
}

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
  InviteLinkError(InviteLinkError),
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

static OFFENSIVE_INVITE_LINKS_REGEX_SET: Lazy<RegexSet> = Lazy::new(|| {
  RegexSet::new(OFFENSIVE_INVITE_LINKS.iter().collect::<Vec<_>>()).unwrap()
});

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

  /// Retrieves blob object metadata and returns a download object
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
    let blob_size = object_metadata
      .content_length()
      .ok_or_else(|| {
        error!(
          errorType = error_types::S3_ERROR,
          "Failed to get S3 object content length"
        );
        BlobServiceError::InvalidState
      })
      .and_then(|len| {
        if len >= 0 {
          Ok(len as u64)
        } else {
          error!(
            errorType = error_types::S3_ERROR,
            "S3 object content length is negative"
          );
          Err(BlobServiceError::InvalidState)
        }
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

  fn validate_invite_link_blob_hash(
    invite_secret: &str,
  ) -> Result<(), BlobServiceError> {
    let lowercase_secret = invite_secret.to_lowercase();
    if (OFFENSIVE_INVITE_LINKS_REGEX_SET.is_match(&lowercase_secret)) {
      debug!("Offensive invite link");
      return Err(BlobServiceError::InviteLinkError(
        InviteLinkError::Offensive,
      ));
    }
    Ok(())
  }

  pub async fn put_blob(
    &self,
    blob_hash: impl Into<String>,
    mut blob_data_stream: impl ByteStream,
  ) -> Result<(), BlobServiceError> {
    let blob_hash: String = blob_hash.into();
    let blob_item = BlobItemInput::new(&blob_hash);

    if self.db.get_blob_item(&blob_hash).await?.is_some() {
      debug!("Blob already exists");
      return Err(BlobServiceError::BlobAlreadyExists);
    }

    if let Some(invite_secret) =
      blob_hash.strip_prefix(INVITE_LINK_BLOB_HASH_PREFIX)
    {
      Self::validate_invite_link_blob_hash(invite_secret)?;
    }

    let mut upload_session =
      self.s3.start_upload_session(&blob_item.s3_path).await?;
    trace!(?blob_item, "Started S3 upload session");

    tokio::pin!(blob_data_stream);
    let mut s3_chunk: Vec<u8> = Vec::new();
    while let Some(chunk) =
      blob_data_stream.try_next().await.map_err(|err| {
        warn!("Failed to get data chunk: {:?}", err);
        BlobServiceError::InputError(err)
      })?
    {
      s3_chunk.extend_from_slice(&chunk);

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
  ) -> BlobServiceResult<()> {
    let blob_hash: String = blob_hash.into();
    trace!(blob_hash, "Attempting to assign holder");
    self
      .db
      .put_holder_assignment(blob_hash.clone(), holder.into())
      .await?;

    trace!("Holder assigned.");
    Ok(())
  }

  pub async fn revoke_holder(
    &self,
    blob_hash: impl Into<String>,
    holder: impl Into<String>,
    instant_delete: bool,
  ) -> BlobServiceResult<()> {
    let blob_hash: String = blob_hash.into();
    let holder: String = holder.into();

    trace!(blob_hash, holder, "Attempting to revoke holder");
    self.db.delete_holder_assignment(&blob_hash, holder).await?;

    if instant_delete || self.config.instant_delete_orphaned_blobs {
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
        return Ok(());
      };

      trace!("Deleting S3 object");
      self.s3.delete_object(&blob_item.s3_path).await?;
      trace!("Deleting blob item entry from DB");
      self.db.delete_blob_item(blob_hash).await?;
    }
    Ok(())
  }

  pub async fn find_existing_blobs(
    &self,
    blob_hashes: HashSet<&String>,
  ) -> BlobServiceResult<HashSet<String>> {
    let primary_keys = blob_hashes.into_iter().map(PrimaryKey::for_blob_item);

    let existing_items: HashSet<String> = self
      .db
      .list_existing_keys(primary_keys)
      .await?
      .into_iter()
      .map(|pk| pk.blob_hash)
      .collect();

    Ok(existing_items)
  }

  pub async fn query_indexed_holders(
    &self,
    prefix: String,
  ) -> BlobServiceResult<Vec<BlobInfo>> {
    let results = self.db.query_indexed_holders(prefix).await?;
    Ok(results)
  }

  pub async fn perform_cleanup(&self) -> anyhow::Result<()> {
    info!("Starting cleanup...");
    // 1. Fetch blobs and holders marked as "unchecked"
    debug!("Querying for unchecked blobs and holders...");
    let protection_periond = self.config.orphan_protection_period;
    let (unchecked_blobs, unchecked_holders) = tokio::try_join!(
      self
        .db
        .find_unchecked_items(UncheckedKind::Blob, protection_periond),
      self
        .db
        .find_unchecked_items(UncheckedKind::Holder, protection_periond)
    )?;
    debug!(
      "Found {} unchecked blobs and {} unchecked holders",
      unchecked_blobs.len(),
      unchecked_holders.len()
    );

    let mut unchecked_items = UncheckedCollection::new();

    // 2. construct structures of possibly orphaned blobs
    debug!("Creating structures of possibly orphaned items...");
    for PrimaryKey { blob_hash, .. } in unchecked_blobs {
      trace!("Creating unchecked item for blob hash '{}'", &blob_hash);
      unchecked_items.insert(
        blob_hash.clone(),
        UncheckedItem {
          blob_hash: Some(blob_hash),
          holders: Vec::new(),
        },
      );
    }

    // 3. iterate over possibly orphaned holders and fill the structs
    for PrimaryKey { blob_hash, holder } in unchecked_holders {
      if let Some(item) = unchecked_items.get_mut(&blob_hash) {
        trace!(
          "Inserting holder '{}' for blob hash '{}'",
          &holder,
          &blob_hash
        );
        item.holders.push(holder);
      } else {
        trace!(
          "Creating empty item for holder '{}' (blob hash: '{}')",
          &holder,
          &blob_hash
        );
        unchecked_items.insert(
          blob_hash.clone(),
          UncheckedItem {
            blob_hash: None,
            holders: vec![holder],
          },
        );
      }
    }

    let mut orphans = HashSet::new();
    let mut checked = HashSet::new();

    // 4. Filter out items that are for sure not orphaned
    let checked_items = unchecked_items.filter_out_checked();
    debug!("Filtered out {} checked items", checked_items.len());
    checked.extend(checked_items);

    // 5. Query DDB for additional blobs and holders to check if they exist
    let mut fetch_results = Vec::new();

    // 5a. Query holders - Find if possibly orphan blobs have at least one holder
    debug!("Querying holders for possibly orphaned blobs...");
    for blob_hash in unchecked_items.blobs_to_find_holders() {
      let holders = self
        .db
        .list_blob_holders(blob_hash, Some(1))
        .await?
        .into_iter()
        .map(|holder| PrimaryKey::new(blob_hash.to_string(), holder));

      let len_before = fetch_results.len();
      fetch_results.extend(holders);
      trace!(
        "Found {} holders for blob hash '{}'",
        fetch_results.len() - len_before,
        blob_hash
      );
    }

    // 5b. Query blobs - Find if possibly orphaned holders have blobs
    debug!("Querying blobs for possibly orphaned holders...");
    let blobs_to_get = unchecked_items.blobs_to_check_existence();
    let queried_blobs_len = blobs_to_get.len();
    let existing_blobs = self.db.list_existing_keys(blobs_to_get).await?;
    debug!(
      "Found {} existing blobs out of {} queried",
      existing_blobs.len(),
      queried_blobs_len
    );
    fetch_results.extend(existing_blobs);

    // 6. Update the struct with query results
    // Then do 2nd pass of filtering out checked items (repeat step 4)
    debug!("Feeding data structure with query results and filtering again...");
    unchecked_items.feed_with_query_results(fetch_results);
    let checked_items = unchecked_items.filter_out_checked();
    debug!("Filtered out {} checked items", checked_items.len());
    checked.extend(checked_items);

    // 7. Perform actual cleanup
    orphans.extend(unchecked_items.into_primary_keys());
    let s3_paths: Vec<S3Path> = orphans
      .iter()
      .filter(|pk| pk.is_blob_item())
      .map(|PrimaryKey { blob_hash, .. }| S3Path {
        bucket_name: CONFIG.s3_bucket_name.clone(),
        object_name: blob_hash.to_string(),
      })
      .collect();

    let num_orphans = orphans.len();
    let num_checked = checked.len();
    let num_s3_blobs = s3_paths.len();

    // 7a. Make changes to database
    debug!("Cleaning up database... Marking {} items as checked and deleting {} orphans", num_checked, num_orphans);
    tokio::try_join!(
      self.db.batch_delete_rows(orphans),
      self.db.batch_mark_checked(checked)
    )?;

    // 7b. Delete orphaned blobs from S3
    debug!("Cleaning up S3... Deleting {} blobs", num_s3_blobs);
    self.s3.batch_delete_objects(s3_paths).await?;

    info!(
      "Cleanup complete. Deleted orphaned {} DB items and marked {} items as checked. {} blobs were deleted from S3",
      num_orphans, num_checked, num_s3_blobs
    );
    Ok(())
  }
}

// A B-tree map performs well for both random and sequential access.
type BlobHash = String;
type UncheckedCollection = BTreeMap<BlobHash, UncheckedItem>;

/// Represents an "unchecked" blob entity. It might miss either
/// blob hash or holders.
#[derive(Debug)]
struct UncheckedItem {
  blob_hash: Option<BlobHash>,
  holders: Vec<String>,
}

impl UncheckedItem {
  fn has_blob_hash(&self) -> bool {
    self.blob_hash.is_some()
  }

  fn has_holders(&self) -> bool {
    !self.holders.is_empty()
  }

  /// Returns primary keys for this item. It contains primary heys for holders
  /// and for blob item (if it has hash).
  /// A fallback hash is required for holders if item's blob hash is None.
  fn as_primary_keys(&self, fallback_blob_hash: &str) -> Vec<PrimaryKey> {
    if !self.has_holders() && !self.has_blob_hash() {
      warn!(
        fallback_blob_hash,
        "Item has no hash and no holders, this should never happen!"
      );
      return Vec::new();
    }

    let hash_for_holders =
      self.blob_hash.as_deref().unwrap_or(fallback_blob_hash);
    let mut keys = self
      .holders
      .iter()
      .map(|holder| PrimaryKey {
        blob_hash: hash_for_holders.to_string(),
        holder: holder.to_string(),
      })
      .collect::<Vec<_>>();

    if let Some(blob_hash) = &self.blob_hash {
      keys.push(PrimaryKey::for_blob_item(blob_hash.to_string()));
    }
    keys
  }
}

trait CleanupOperations {
  /// Retains only items that should remain unchecked
  /// (missing blob hash or holders).
  ///
  /// Returns removed items - these items are checked
  /// (contain both blob hash and at least one holder).
  fn filter_out_checked(&mut self) -> Vec<PrimaryKey>;

  /// Returns list of blob hashes for which we need to query if they contain
  /// at least one holder
  fn blobs_to_find_holders(&self) -> Vec<&BlobHash>;

  /// Returns primary keys for blob items that need to be checked if they exist
  ///
  /// Technically, this returns all items that have holders but no hash.
  fn blobs_to_check_existence(&self) -> Vec<PrimaryKey>;

  /// Updates the structure after fetching additional data from database.
  fn feed_with_query_results(
    &mut self,
    fetched_items: impl IntoIterator<Item = PrimaryKey>,
  );

  /// Turns this collection into a list of DB primary keys
  fn into_primary_keys(self) -> Vec<PrimaryKey>;
}

impl CleanupOperations for UncheckedCollection {
  /// Retains only items that should remain unchecked
  /// (missing blob hash or holders).
  ///
  /// Returns removed items - these items are checked
  /// (contain both blob hash and at least one holder).
  fn filter_out_checked(&mut self) -> Vec<PrimaryKey> {
    let mut checked = Vec::new();

    self.retain(|blob_hash, item| {
      if !item.has_blob_hash() || !item.has_holders() {
        // blob hash or holder missing, leave unchecked
        return true;
      }

      checked.extend(item.as_primary_keys(blob_hash));
      false
    });
    checked
  }

  /// Returns list of blob hashes for which we need to query if they contain
  /// at least one holder
  fn blobs_to_find_holders(&self) -> Vec<&BlobHash> {
    self
      .iter()
      .filter_map(|(blob_hash, item)| {
        if item.has_blob_hash() && !item.has_holders() {
          Some(blob_hash)
        } else {
          None
        }
      })
      .collect()
  }

  /// Returns primary keys for blob items that need to be checked if they exist
  ///
  /// Technically, this returns all blob items that have holders but no hash.
  fn blobs_to_check_existence(&self) -> Vec<PrimaryKey> {
    self
      .iter()
      .filter_map(|(blob_hash, item)| {
        if item.has_holders() && !item.has_blob_hash() {
          Some(PrimaryKey::for_blob_item(blob_hash))
        } else {
          None
        }
      })
      .collect()
  }

  /// Updates the structure after fetching additional data from database.
  fn feed_with_query_results(
    &mut self,
    fetched_items: impl IntoIterator<Item = PrimaryKey>,
  ) {
    for pk in fetched_items.into_iter() {
      let Some(item) = self.get_mut(&pk.blob_hash) else {
        warn!("Got fetched item that was not requested: {:?}", pk);
        continue;
      };

      if pk.is_blob_item() {
        item.blob_hash = Some(pk.blob_hash)
      } else {
        item.holders.push(pk.holder);
      }
    }
  }

  fn into_primary_keys(self) -> Vec<PrimaryKey> {
    self
      .into_iter()
      .flat_map(|(blob_hash, item)| item.as_primary_keys(&blob_hash))
      .collect()
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

        yield s3_client.get_object_bytes(&s3_path, range).await?;

        offset += next_size;
      }
    }
  }
}
