// Assorted constants

pub const DEFAULT_GRPC_PORT: u16 = 50051;
pub const DEFAULT_HTTP_PORT: u16 = 51001;
pub const AWS_REGION: &str = "us-east-2";
pub const LOCALSTACK_URL: &str = "http://localstack:4566";
pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;

/// 4MB limit
///
/// WARNING: use keeping in mind that grpc adds its own headers to messages
/// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
/// so the message that actually is being sent over the network looks like this
/// ```
/// [Compressed-Flag] [Message-Length] [Message]
///    [Compressed-Flag]   1 byte  - added by grpc
///    [Message-Length]    4 bytes - added by grpc
///    [Message]           N bytes - actual data
/// ```
/// so for every message we get 5 additional bytes of data
/// as [mentioned here](https://github.com/grpc/grpc/issues/15734#issuecomment-396962671),
/// gRPC stream may contain more than one message
pub const GRPC_CHUNK_SIZE_LIMIT: u64 = 4 * 1024 * 1024;

/// See [`GRPC_CHUNK_SIZE_LIMIT`] description for details
pub const GRPC_METADATA_SIZE_PER_MESSAGE: u64 = 5;

// HTTP constants

pub const BLOB_DOWNLOAD_CHUNK_SIZE: u64 = 5 * 1024 * 1024;

// DynamoDB constants

pub const BLOB_TABLE_NAME: &str = "blob-service-blob";
pub const BLOB_TABLE_BLOB_HASH_FIELD: &str = "blobHash";
pub const BLOB_TABLE_S3_PATH_FIELD: &str = "s3Path";
pub const BLOB_TABLE_CREATED_FIELD: &str = "created";

pub const BLOB_REVERSE_INDEX_TABLE_NAME: &str = "blob-service-reverse-index";
pub const BLOB_REVERSE_INDEX_TABLE_HOLDER_FIELD: &str = "holder";
pub const BLOB_REVERSE_INDEX_TABLE_BLOB_HASH_FIELD: &str = "blobHash";
pub const BLOB_REVERSE_INDEX_TABLE_HASH_INDEX_NAME: &str = "blobHash-index";

// Environment variables

pub const SANDBOX_ENV_VAR: &str = "COMM_SERVICES_SANDBOX";
pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;

// S3 constants

pub const BLOB_S3_BUCKET_NAME: &str = "commapp-blob";
pub const S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE: u64 = 5 * 1024 * 1024;
