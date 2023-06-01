use std::str::FromStr;

use chrono::{DateTime, Utc};
use constant_time_eq::constant_time_eq;
use ed25519_dalek::Signature;
use serde::Deserialize;
use tonic::Status;

#[derive(Deserialize)]
struct AccountOwnershipMessage {
  statement: String,
  username: String,
  issued_at: String,
}

pub fn validate_signed_keyserver_message(
  username: &str,
  keyserver_message: &str,
  keyserver_signature: &str,
) -> Result<(), Status> {
  // Deserialize the keyserver message
  let deserialized_message: AccountOwnershipMessage =
    serde_json::from_str(keyserver_message)
      .map_err(|_| Status::invalid_argument("message format invalid"))?;

  let message_statement = deserialized_message.statement;
  if !constant_time_eq(
    message_statement.as_bytes(),
    b"This user is the owner of the following username",
  ) {
    return Err(Status::invalid_argument("message invalid"));
  }
  let message_username = deserialized_message.username;
  let issued_at: DateTime<Utc> = deserialized_message
    .issued_at
    .parse()
    .map_err(|_| Status::invalid_argument("message format invalid"))?;

  // Check that the username in the gRPC message matches the username in the keyserver_message string
  if message_username != username {
    return Err(Status::invalid_argument("message invalid"));
  }

  // Check that no more than 5 seconds have passed since the timestamp in the keyserver_message string
  let now = Utc::now();
  if (now - issued_at).num_seconds() > 5 {
    return Err(Status::invalid_argument("message invalid"));
  }

  let _signature = Signature::from_str(keyserver_signature)
    .map_err(|_| Status::invalid_argument("message invalid"))?;

  // TODO: verify the signature once ashoat's keyserver is registered

  Ok(())
}
