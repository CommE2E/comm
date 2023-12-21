use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatestBackupIDResponse {
  #[serde(rename = "backupID")]
  pub backup_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadLogRequest {
  pub log_id: usize,
  pub content: Vec<u8>,
  pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogWSRequest {
  UploadLog(UploadLogRequest),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogWSResponse {
  LogUploaded { log_id: usize },
  ServerError,
}
