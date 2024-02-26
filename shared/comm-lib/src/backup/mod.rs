use crate::auth::UserIdentity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatestBackupIDResponse {
  #[serde(rename = "backupID")]
  pub backup_id: String,
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
  Unauthenticated,
}
