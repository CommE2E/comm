pub mod aes {
  pub const KEY_SIZE: usize = 32; // bytes
  pub const IV_LENGTH: usize = 12; // bytes - unique Initialization Vector (nonce)
  pub const TAG_LENGTH: usize = 16; // bytes - GCM auth tag
}

/// Should match constants defined in `CommSecureStore.h`
pub mod secure_store {
  pub const COMM_SERVICES_ACCESS_TOKEN: &str = "accessToken";
  pub const USER_ID: &str = "userID";
  pub const DEVICE_ID: &str = "deviceID";
}
