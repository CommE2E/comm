// Assorted constants

pub const MPSC_CHANNEL_BUFFER_CAPACITY: usize = 1;
pub const ID_SEPARATOR: &str = ":";
pub const ATTACHMENT_HOLDER_SEPARATOR: &str = ";";
pub const WS_FRAME_SIZE: usize = 1_048_576; // 1MiB
pub const LOG_DEFAULT_PAGE_SIZE: i32 = 20;
pub const LOG_BACKUP_ID_SEPARATOR: &str = "#";

// Configuration defaults
pub const DEFAULT_HTTP_PORT: u16 = 50052;
pub const DEFAULT_BLOB_SERVICE_URL: &str = "http://localhost:50053";

// Environment variable names
pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;
pub const COMM_SERVICES_USE_JSON_LOGS: &str = "COMM_SERVICES_USE_JSON_LOGS";

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
    pub const SIWE_BACKUP_MSG: &str = "siweBackupMsg";
  }
}

pub mod log_table {
  pub const TABLE_NAME: &str = "backup-service-log";

  pub mod attr {
    pub const BACKUP_ID: &str = "backupID";
    pub const LOG_ID: &str = "logID";
    pub const CONTENT_DB: &str = "content";
    pub const CONTENT_BLOB_INFO: &str = "blobInfo";
    pub const ATTACHMENTS: &str = "attachments";
  }
}

// Error Types

pub mod error_types {
  pub const DDB_ERROR: &str = "DDB Error";
  pub const AUTH_ERROR: &str = "Auth Error";
  pub const BLOB_ERROR: &str = "Blob Error";
  pub const WS_ERROR: &str = "WS Error";
}
