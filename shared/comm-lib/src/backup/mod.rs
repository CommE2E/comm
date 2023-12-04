use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatestBackupIDResponse {
  #[serde(rename = "backupID")]
  pub backup_id: String,
}
