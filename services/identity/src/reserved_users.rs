use std::str::FromStr;

use chrono::{DateTime, Utc};
use constant_time_eq::constant_time_eq;
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::Deserialize;
use tonic::Status;

use crate::config::CONFIG;

#[derive(Deserialize)]
struct ReservedUsernameMessage {
  statement: String,
  username: String,
  issued_at: String,
}

fn validate_message(
  keyserver_message: &str,
  keyserver_signature: &str,
  statement: &[u8],
) -> Result<ReservedUsernameMessage, Status> {
  let deserialized_message: ReservedUsernameMessage =
    serde_json::from_str(keyserver_message)
      .map_err(|_| Status::invalid_argument("message format invalid"))?;

  if !constant_time_eq(deserialized_message.statement.as_bytes(), statement) {
    return Err(Status::invalid_argument("message invalid"));
  }

  let issued_at: DateTime<Utc> = deserialized_message
    .issued_at
    .parse()
    .map_err(|_| Status::invalid_argument("message format invalid"))?;

  let now = Utc::now();
  if (now - issued_at).num_seconds() > 5 {
    return Err(Status::invalid_argument("message invalid"));
  }

  let signature = Signature::from_str(keyserver_signature)
    .map_err(|_| Status::invalid_argument("signature invalid"))?;

  let public_key_string = CONFIG
    .keyserver_public_key
    .clone()
    .ok_or(Status::failed_precondition("missing key"))?;

  let public_key: PublicKey =
    PublicKey::from_bytes(public_key_string.as_bytes())
      .map_err(|_| Status::failed_precondition("malformed key"))?;

  public_key
    .verify(keyserver_message.as_bytes(), &signature)
    .map_err(|_| Status::permission_denied("verification failed"))?;

  Ok(deserialized_message)
}

pub fn validate_signed_account_ownership_message(
  username: &str,
  keyserver_message: &str,
  keyserver_signature: &str,
) -> Result<(), Status> {
  let deserialized_message = validate_message(
    keyserver_message,
    keyserver_signature,
    b"This user is the owner of the following username",
  )?;

  if deserialized_message.username != username {
    return Err(Status::invalid_argument("message invalid"));
  }

  Ok(())
}
