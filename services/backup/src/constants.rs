// Assorted constants

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const ID_SEPARATOR: &str = ":";
pub const ATTACHMENT_HOLDER_SEPARATOR: &str = ";";

// Configuration defaults
pub const DEFAULT_HTTP_PORT: u16 = 50052;
pub const DEFAULT_BLOB_SERVICE_URL: &str = "http://localhost:50053";

// Environment variable names
pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;

// DynamoDB constants
pub mod backup_table {
  pub const TABLE_NAME: &str = "backup-service-backup";
  pub const CREATED_INDEX: &str = "userID-created-index";

  pub mod attr {
    pub const USER_ID: &str = "userID";
    pub const BACKUP_ID: &str = "backupID";
    pub const CREATED: &str = "created";
    pub const USER_DATA: &str = "userData";
    pub const USER_KEYS: &str = "userKeys";
    pub const ATTACHMENTS: &str = "attachments";
  }
}

pub const LOG_TABLE_NAME: &str = "backup-service-log";
pub const LOG_TABLE_FIELD_BACKUP_ID: &str = "backupID";
pub const LOG_TABLE_FIELD_LOG_ID: &str = "logID";
pub const LOG_TABLE_FIELD_PERSISTED_IN_BLOB: &str = "persistedInBlob";
pub const LOG_TABLE_FIELD_VALUE: &str = "value";
pub const LOG_TABLE_FIELD_ATTACHMENT_HOLDERS: &str = "attachmentHolders";
pub const LOG_TABLE_FIELD_DATA_HASH: &str = "dataHash";
