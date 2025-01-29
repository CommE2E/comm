use std::time::Duration;

#[allow(unused)]
pub mod aes {
  pub const KEY_SIZE: usize = 32; // bytes
  pub const IV_LENGTH: usize = 12; // bytes - unique Initialization Vector (nonce)
  pub const TAG_LENGTH: usize = 16; // bytes - GCM auth tag
}

pub mod secure_store {
  /// Should match constants defined in `CommSecureStore.h`
  pub const COMM_SERVICES_ACCESS_TOKEN: &str = "accessToken";
  pub const USER_ID: &str = "userID";
  pub const DEVICE_ID: &str = "deviceID";
  pub const SECURE_STORE_BACKUP_DATA_KEY_ID: &str = "comm.encryptionKey";
  pub const SECURE_STORE_BACKUP_LOG_DATA_KEY_ID: &str =
    "comm.backupLogsEncryptionKey";
}

pub const BACKUP_SERVICE_CONNECTION_RETRY_DELAY: Duration =
  Duration::from_secs(5);
