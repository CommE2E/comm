// Assorted constants

pub const DEFAULT_HTTP_PORT: u16 = 50053;
pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;

// HTTP constants

pub const BLOB_DOWNLOAD_CHUNK_SIZE: u64 = 5 * 1024 * 1024;

// DynamoDB constants
pub mod db {
  /// Reserved holder value that indicates the row is a blob item
  pub const BLOB_ITEM_ROW_HOLDER_VALUE: &str = "_";

  pub const BLOB_TABLE_NAME: &str = "blob-service-blobs";
  pub const BLOB_PARTITION_KEY: &str = ATTR_BLOB_HASH;
  pub const BLOB_SORT_KEY: &str = ATTR_HOLDER;

  pub const UNCHECKED_INDEX_NAME: &str = "unchecked-index";
  pub const UNCHECKED_INDEX_PARTITION_KEY: &str = ATTR_UNCHECKED;
  pub const UNCHECKED_INDEX_SORT_KEY: &str = ATTR_LAST_MODIFIED;

  /// attribute names
  pub const ATTR_BLOB_HASH: &str = "blob_hash";
  pub const ATTR_HOLDER: &str = "holder";
  pub const ATTR_CREATED_AT: &str = "created_at";
  pub const ATTR_LAST_MODIFIED: &str = "last_modified";
  pub const ATTR_S3_PATH: &str = "s3_path";
  pub const ATTR_UNCHECKED: &str = "unchecked";
}

// Environment variables

pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;

// S3 constants

pub const S3_BUCKET_ENV_VAR: &str = "BLOB_S3_BUCKET_NAME";
pub const DEFAULT_S3_BUCKET_NAME: &str = "commapp-blob";
pub const S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE: u64 = 5 * 1024 * 1024;
