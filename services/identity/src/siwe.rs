use chrono::Utc;
use siwe::{eip55, Message};
use tonic::Status;
use tracing::error;

pub fn parse_and_verify_siwe_message(
  siwe_message: &str,
  siwe_signature: &str,
) -> Result<String, Status> {
  let siwe_message: Message = match siwe_message.parse() {
    Ok(m) => m,
    Err(e) => {
      error!("Failed to parse SIWE message: {}", e);
      return Err(Status::invalid_argument("invalid message"));
    }
  };

  let decoded_signature = hex::decode(siwe_signature.trim_start_matches("0x"))
    .map_err(|e| {
      error!("Failed to decode SIWE signature: {}", e);
      Status::invalid_argument("invalid signature")
    })?;

  match siwe_message.verify(
    match decoded_signature.try_into() {
      Ok(s) => s,
      Err(e) => {
        error!("Conversion to SIWE signature failed: {:?}", e);
        return Err(Status::invalid_argument("invalid message"));
      }
    },
    None,
    None,
    Some(&Utc::now()),
  ) {
    Err(e) => {
      error!("Signature verification failed: {}", e);
      Err(Status::unauthenticated("message not authenticated"))
    }
    Ok(_) => Ok(eip55(&siwe_message.address)),
  }
}
