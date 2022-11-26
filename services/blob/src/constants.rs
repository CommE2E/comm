// Assorted constants

pub const GRPC_SERVER_DEFAULT_PORT: u64 = 50051;
pub const AWS_REGION: &str = "us-east-2";
pub const LOCALSTACK_URL: &str = "http://localhost:4566";

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

// S3 constants

pub const BLOB_S3_BUCKET_NAME: &str = "commapp-blob";
