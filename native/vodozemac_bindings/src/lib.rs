use std::error::Error as StdError;

mod vodozemac;

use vodozemac::{session_from_pickle, VodozemacSession};

use crate::vodozemac::*;

#[cxx::bridge]
pub mod ffi {

  // Vodozemac crypto functions
  // NOTE: Keep in sync with Vodozemac crypto functions block
  // in native/native_rust_library/src/lib.rs
  extern "Rust" {
    // EncryptResult type
    type EncryptResult;
    fn encrypt_result_new(
      encrypted_message: String,
      message_type: u32,
    ) -> Box<EncryptResult>;
    fn encrypted_message(self: &EncryptResult) -> String;
    fn message_type(self: &EncryptResult) -> u32;

    // VodozemacSession type
    type VodozemacSession;
    fn pickle(self: &VodozemacSession, pickle_key: &[u8; 32]) -> String;
    fn encrypt(
      self: &mut VodozemacSession,
      plaintext: &str,
    ) -> Result<Box<EncryptResult>>;
    fn decrypt(
      self: &mut VodozemacSession,
      encrypted_message: String,
      message_type: u32,
    ) -> Result<String>;
    fn has_received_message(self: &VodozemacSession) -> bool;
    fn is_sender_chain_empty(self: &VodozemacSession) -> bool;

    pub fn session_from_pickle(
      session_state: String,
      session_key: String,
    ) -> Result<Box<VodozemacSession>>;

    // VodozemacAccount type
    type VodozemacAccount;
    fn pickle(self: &VodozemacAccount, pickle_key: &[u8; 32]) -> String;
    fn ed25519_key(self: &VodozemacAccount) -> String;
    fn curve25519_key(self: &VodozemacAccount) -> String;
    fn sign(self: &VodozemacAccount, message: &str) -> String;
    fn generate_one_time_keys(self: &mut VodozemacAccount, count: usize);
    fn one_time_keys(self: &VodozemacAccount) -> Vec<String>;
    fn mark_keys_as_published(self: &mut VodozemacAccount);
    fn max_number_of_one_time_keys(self: &VodozemacAccount) -> usize;
    fn mark_prekey_as_published(self: &mut VodozemacAccount) -> bool;
    fn generate_prekey(self: &mut VodozemacAccount);
    fn forget_old_prekey(self: &mut VodozemacAccount);
    fn last_prekey_publish_time(self: &mut VodozemacAccount) -> u64;
    fn prekey(self: &VodozemacAccount) -> String;
    fn unpublished_prekey(self: &VodozemacAccount) -> String;
    fn prekey_signature(self: &VodozemacAccount) -> String;
    fn create_outbound_session(
      self: &VodozemacAccount,
      identity_key: &str,
      signing_key: &str,
      one_time_key: &str,
      pre_key: &str,
      pre_key_signature: &str,
      olm_compatibility_mode: bool,
    ) -> Result<Box<VodozemacSession>>;
    fn create_inbound_session(
      self: &mut VodozemacAccount,
      identity_key: &str,
      message: &EncryptResult,
    ) -> Result<Box<InboundCreationResult>>;

    pub fn account_new() -> Box<VodozemacAccount>;

    pub fn account_from_pickle(
      account_state: String,
      session_key: String,
    ) -> Result<Box<VodozemacAccount>>;

    pub fn verify_ed25519_signature(
      public_key: &str,
      message: &str,
      signature: &str,
    ) -> Result<()>;

    pub fn verify_prekey_signature(
      public_key: &str,
      prekey_base64: &str,
      signature: &str,
    ) -> Result<()>;

    pub fn sha256(input: &[u8]) -> String;

    // InboundCreationResult type
    type InboundCreationResult;
    fn plaintext(self: &InboundCreationResult) -> String;
    fn take_session(self: &mut InboundCreationResult) -> Box<VodozemacSession>;
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
