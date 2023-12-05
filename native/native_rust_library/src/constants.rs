#[allow(unused)]
pub mod aes {
  pub const KEY_SIZE: usize = 32; // bytes
  pub const IV_LENGTH: usize = 12; // bytes - unique Initialization Vector (nonce)
  pub const TAG_LENGTH: usize = 16; // bytes - GCM auth tag
}

#[cfg(debug_assertions)]
pub const DEFAULT_SOCKET_ADDR: &str =
  "https://identity.staging.commtechnologies.org:50054";

#[cfg(not(debug_assertions))]
pub const DEFAULT_SOCKET_ADDR: &str =
  "https://identity.commtechnologies.org:50054";

#[cfg(test)]
mod tests {
  use super::*;

  #[cfg(debug_assertions)]
  #[test]
  fn test_default_socket_addr_debug() {
    assert_eq!(
      DEFAULT_SOCKET_ADDR,
      "https://identity.staging.commtechnologies.org:50054"
    );
  }

  #[cfg(not(debug_assertions))]
  #[test]
  fn test_default_socket_addr_release() {
    assert_eq!(
      DEFAULT_SOCKET_ADDR,
      "https://identity.commtechnologies.org:50054"
    );
  }
}
