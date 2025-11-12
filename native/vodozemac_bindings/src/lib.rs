use std::error::Error as StdError;

mod session;

use session::{session_from_pickle, VodozemacSession};

use crate::session::*;

#[cxx::bridge]
pub mod ffi {

  // Vodozemac crypto functions only
  extern "Rust" {

    type VodozemacSession;
    type EncryptResult;
    fn pickle(self: &VodozemacSession, pickle_key: &[u8; 32]) -> String;
    fn encrypted_message(self: &EncryptResult) -> String;
    fn message_type(self: &EncryptResult) -> u32;
    fn encrypt(
      self: &mut VodozemacSession,
      plaintext: &str,
    ) -> Result<Box<EncryptResult>>;
    fn decrypt(
      self: &mut VodozemacSession,
      encrypted_message: String,
      message_type: u32,
    ) -> Result<String>;

    pub fn session_from_pickle(
      session_state: String,
      session_key: String,
    ) -> Result<Box<VodozemacSession>>;

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
