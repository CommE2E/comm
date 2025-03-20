use crate::auth::UserIdentity;
use serde::{Deserialize, Serialize};

/// shared database types and constants
pub mod database;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LatestBackupInfoResponse {
  #[serde(rename = "backupID")]
  pub backup_id: String,
  #[serde(rename = "userID")]
  pub user_id: String,
  pub siwe_backup_msg: Option<String>,
  pub keyserver_device_id: Option<String>,
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
