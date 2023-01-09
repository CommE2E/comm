// Assorted constants

pub const AWS_REGION: &str = "us-east-2";
pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const ID_SEPARATOR: &str = ":";

// 400KiB limit (in docs there is KB but they mean KiB) -
// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
// This includes both attribute names' and values' lengths
pub const LOG_DATA_SIZE_DATABASE_LIMIT: usize = 1024 * 400;

// Configuration defaults

pub const DEFAULT_GRPC_SERVER_PORT: u64 = 50051;
pub const DEFAULT_LOCALSTACK_URL: &str = "http://localhost:4566";
pub const DEFAULT_BLOB_SERVICE_URL: &str = "http://localhost:50053";

// Environment variable names

pub const SANDBOX_ENV_VAR: &str = "COMM_SERVICES_SANDBOX";
pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;

// DynamoDB constants

pub const BACKUP_TABLE_NAME: &str = "backup-service-backup";
pub const BACKUP_TABLE_FIELD_USER_ID: &str = "userID";
pub const BACKUP_TABLE_FIELD_BACKUP_ID: &str = "backupID";
pub const BACKUP_TABLE_FIELD_CREATED: &str = "created";
pub const BACKUP_TABLE_FIELD_RECOVERY_DATA: &str = "recoveryData";
pub const BACKUP_TABLE_FIELD_COMPACTION_HOLDER: &str = "compactionHolder";
pub const BACKUP_TABLE_FIELD_ATTACHMENT_HOLDERS: &str = "attachmentHolders";
pub const BACKUP_TABLE_INDEX_USERID_CREATED: &str = "userID-created-index";

pub const LOG_TABLE_NAME: &str = "backup-service-log";
pub const LOG_TABLE_FIELD_BACKUP_ID: &str = "backupID";
pub const LOG_TABLE_FIELD_LOG_ID: &str = "logID";
pub const LOG_TABLE_FIELD_PERSISTED_IN_BLOB: &str = "persistedInBlob";
pub const LOG_TABLE_FIELD_VALUE: &str = "value";
pub const LOG_TABLE_FIELD_ATTACHMENT_HOLDERS: &str = "attachmentHolders";
pub const LOG_TABLE_FIELD_DATA_HASH: &str = "dataHash";
