use std::error::Error as StdError;
use std::fmt::Display;

mod crypto;
pub mod session;

use session::{VodozemacSession, session_from_pickle};

// Re-export crypto functions
pub use crate::session::*;

#[cxx::bridge]
pub mod ffi {
  // Crypto result types (copied from native_rust_library for compatibility)

  // Vodozemac crypto functions only
  extern "Rust" {
    // #[cxx_name = "decryptWithVodozemac"]
    // fn decrypt_with_vodozemac(
    //   session_state: String,
    //   encrypted_message: String,
    //   message_type: u32,
    //   session_key: String,
    // ) -> Result<DecryptResult>;
    //
    // #[cxx_name = "encryptWithVodozemac"]
    // fn encrypt_with_vodozemac(
    //   session_state: String,
    //   plaintext: String,
    //   session_key: String,
    // ) -> Result<EncryptResult>;
    //
    // #[cxx_name = "encryptWithVodozemac2"]
    // fn encrypt_with_vodozemac2(
    //   session_state: String,
    //   plaintext: String,
    //   session_key: String,
    // ) -> Result<EncryptResult>;
    //
    // #[cxx_name = "encryptWithVodozemac3"]
    // fn encrypt_with_vodozemac3(
    //   session_state: String,
    //   plaintext: String,
    //   session_key: String,
    // ) -> Result<EncryptResult>;

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

    // fn session_id(self: &Session) -> String;
    // fn session_keys(self: &Session) -> SessionKeys;
    // fn session_matches(self: &Session, message: &OlmMessage) -> bool;
    // fn encrypt(self: &mut Session, plaintext: &str) -> Box<OlmMessage>;
    // fn decrypt(self: &mut Session, message: &OlmMessage) -> Result<String>;
    // fn session_from_pickle(pickle: &str, pickle_key: &[u8; 32]) -> Result<Box<Session>>;
    //
    // type OlmMessage;
    // fn to_parts(self: &OlmMessage) -> OlmMessageParts;
    // fn olm_message_from_parts(parts: &OlmMessageParts) -> Result<Box<OlmMessage>>;
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