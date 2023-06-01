use std::str::FromStr;

use chrono::{DateTime, Utc};
use ed25519_dalek::Signature;
use regex::Regex;
use tonic::Status;
use tracing::error;

pub fn validate_signed_keyserver_message(
  username: &str,
  keyserver_message: &str,
  keyserver_signature: &str,
) -> Result<(), Status> {
  // Prepare regex to match the keyserver_message string
  let re = Regex::new(
    r"^This user is the owner of the following username:\n(.+)\n\nIssued At: ([^Z]+Z)$",
  ).map_err(|_|{
    error!("Invalid regex expression");
    Status::internal("internal error")})?;
  let caps = match re.captures(keyserver_message) {
    Some(caps) => caps,
    None => return Err(Status::invalid_argument("message format invalid")),
  };

  let message_username = &caps[1];
  let issued_at: DateTime<Utc> = caps[2]
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
