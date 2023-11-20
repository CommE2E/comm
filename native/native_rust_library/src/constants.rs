#[allow(unused)]
pub mod aes {
  pub const KEY_SIZE: usize = 32; // bytes
  pub const IV_LENGTH: usize = 12; // bytes - unique Initialization Vector (nonce)
  pub const TAG_LENGTH: usize = 16; // bytes - GCM auth tag
}
