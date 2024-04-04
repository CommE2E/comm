use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use siwe::Message;
use tonic::Status;
use tracing::error;

pub fn parse_and_verify_siwe_message(
  siwe_message: &str,
  siwe_signature: &str,
) -> Result<Message, Status> {
  let siwe_message: Message = siwe_message.parse().map_err(|e| {
    error!("Failed to parse SIWE message: {}", e);
    Status::invalid_argument("invalid message")
  })?;

  let decoded_signature = hex::decode(siwe_signature.trim_start_matches("0x"))
    .map_err(|e| {
      error!("Failed to decode SIWE signature: {}", e);
      Status::invalid_argument("invalid signature")
    })?;

  let signature = decoded_signature.try_into().map_err(|e| {
    error!("Conversion to SIWE signature failed: {:?}", e);
    Status::invalid_argument("invalid message")
  })?;

  siwe_message
    .verify(signature, None, None, Some(&Utc::now()))
    .map_err(|e| {
      error!("Signature verification failed: {}", e);
      Status::unauthenticated("message not authenticated")
    })?;

  Ok(siwe_message)
}

pub fn is_valid_ethereum_address(candidate: &str) -> bool {
  let ethereum_address_regex = Regex::new(r"^0x[a-fA-F0-9]{40}$").unwrap();
  ethereum_address_regex.is_match(candidate)
}

#[derive(derive_more::Constructor, Serialize, Deserialize)]
pub struct SocialProof {
  pub message: String,
  pub signature: String,
}

impl TryFrom<String> for SocialProof {
  type Error = crate::error::Error;

  fn try_from(value: String) -> Result<Self, Self::Error> {
    serde_json::from_str(&value).map_err(|err| {
      error!("Failed to deserialize social proof: {err}");
      err.into()
    })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_valid_ethereum_address() {
    assert!(is_valid_ethereum_address(
      "0x1234567890123456789012345678901234567890"
    ),);
    assert!(is_valid_ethereum_address(
      "0xABCDEF123456789012345678901234567890ABCD"
    ));
    assert!(is_valid_ethereum_address(
      "0xabcdef123456789012345678901234567890abcd"
    ));
  }

  #[test]
  fn test_invalid_ethereum_address() {
    // Shorter than 42 characters
    assert_eq!(
      is_valid_ethereum_address("0x12345678901234567890123456789012345678"),
      false
    );
    // Longer than 42 characters
    assert_eq!(
      is_valid_ethereum_address("0x123456789012345678901234567890123456789012"),
      false
    );
    // Missing 0x prefix
    assert_eq!(
      is_valid_ethereum_address("1234567890123456789012345678901234567890"),
      false
    );
    // Contains invalid characters
    assert_eq!(
      is_valid_ethereum_address("0x1234567890GHIJKL9012345678901234567890"),
      false
    );
    // Empty string
    assert_eq!(is_valid_ethereum_address(""), false);
  }
}
