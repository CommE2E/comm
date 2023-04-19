use chrono::Utc;
use siwe::{eip55, Message};
use tonic::Status;
use tracing::error;

pub fn parse_and_verify_siwe_message(
  siwe_message: &str,
  siwe_signature: &str,
) -> Result<String, Status> {
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

  Ok(eip55(&siwe_message.address))
}
