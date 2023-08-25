#[derive(Debug, Clone)]
pub struct BackupData {
  pub backup_id: String,
  pub user_keys_hash: String,
  pub user_keys: Vec<u8>,
  pub user_data_hash: String,
  pub user_data: Vec<u8>,
  pub attachments: Vec<String>,
}
