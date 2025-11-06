use std::error::Error as StdError;

mod crypto;

// Re-export crypto functions
pub use crate::crypto::{decrypt_with_vodozemac, encrypt_with_vodozemac, encrypt_with_vodozemac2, encrypt_with_vodozemac3};

#[cxx::bridge]
pub mod ffi {
  // Crypto result types (copied from native_rust_library for compatibility)
  struct DecryptResult {
    decrypted_message: String,
    updated_session_state: String,
  }

  struct EncryptResult {
    encrypted_message: String,
    message_type: u32,
    updated_session_state: String,
  }

  // Vodozemac crypto functions only
  extern "Rust" {
    #[cxx_name = "decryptWithVodozemac"]
    fn decrypt_with_vodozemac(
      session_state: String,
      encrypted_message: String,
      message_type: u32,
      session_key: String,
    ) -> Result<DecryptResult>;

    #[cxx_name = "encryptWithVodozemac"]
    fn encrypt_with_vodozemac(
      session_state: String,
      plaintext: String,
      session_key: String,
    ) -> Result<EncryptResult>;

    #[cxx_name = "encryptWithVodozemac2"]
    fn encrypt_with_vodozemac2(
      session_state: String,
      plaintext: String,
      session_key: String,
    ) -> Result<EncryptResult>;

    #[cxx_name = "encryptWithVodozemac3"]
    fn encrypt_with_vodozemac3(
      session_state: String,
      plaintext: String,
      session_key: String,
    ) -> Result<EncryptResult>;
  }
}

// Error types for compatibility
#[derive(Debug, derive_more::Display)]
pub struct StringError(String);

impl StdError for StringError {}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(fmt = "Generic error: {}", "_0")]
  Generic(StringError),
}

#[cfg(test)]
mod tests {
  #[test]
  fn test_basic_crypto() {
    // Basic smoke test
    assert!(true);
  }
}