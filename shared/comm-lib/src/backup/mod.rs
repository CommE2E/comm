use crate::auth::UserIdentity;
use derive_more::Display;
use serde::{Deserialize, Serialize};

/// shared database types and constants
pub mod database;

#[derive(Debug, Display, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[display(
  fmt = "BackupVersion(code={}, state={}, db={})",
  code_version,
  state_version,
  db_version
)]
pub struct BackupVersionInfo {
  /// App code version
  pub code_version: u16,
  /// Redux state version
  pub state_version: u16,
  /// SQLite DB version
  pub db_version: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LatestBackupInfoResponse {
  #[serde(rename = "backupID")]
  pub backup_id: String,
  #[serde(rename = "userID")]
  pub user_id: String,
  pub siwe_backup_msg: Option<String>,
  #[serde(rename = "keyserverDeviceID")]
  pub keyserver_device_id: Option<String>,
  // ISO 8601 / RFC 3339 DateTime string
  #[serde(default)]
  pub creation_timestamp: String,
  #[serde(default)]
  pub total_backup_size: u64,
  #[serde(default)]
  pub version_info: BackupVersionInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadLogRequest {
  pub backup_id: String,
  pub log_id: usize,
  pub content: Vec<u8>,
  pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadLogsRequest {
  pub backup_id: String,
  pub from_id: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, derive_more::From)]
pub enum LogWSRequest {
  Authenticate(UserIdentity),
  UploadLog(UploadLogRequest),
  DownloadLogs(DownloadLogsRequest),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogWSResponse {
  LogUploaded {
    backup_id: String,
    log_id: usize,
  },
  LogDownload {
    log_id: usize,
    content: Vec<u8>,
    attachments: Option<Vec<String>>,
  },
  LogDownloadFinished {
    last_log_id: Option<usize>,
  },
  ServerError,
  AuthSuccess,
  Unauthenticated,
}
