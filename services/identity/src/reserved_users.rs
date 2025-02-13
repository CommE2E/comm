use chrono::{DateTime, Utc};
use constant_time_eq::constant_time_eq;
use serde::Deserialize;
use tonic::Status;

use crate::{config::CONFIG, constants::tonic_status_messages};

// This type should not be changed without making equivalent changes to
// `ReservedUsernameMessage` in lib/types/crypto-types.js
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Message<T> {
  statement: String,
  payload: T,
  issued_at: String,
}

// This type should not be changed without making equivalent changes to
// `ReservedUsernameMessage` in lib/types/crypto-types.js
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDetail {
  pub username: String,
  #[serde(rename = "userID")]
  pub user_id: String,
}

fn validate_and_decode_message<T: serde::de::DeserializeOwned>(
  keyserver_message: &str,
  keyserver_signature: &str,
  expected_statement: &[u8],
) -> Result<Message<T>, Status> {
  let deserialized_message: Message<T> =
    serde_json::from_str(keyserver_message).map_err(|_| {
      Status::invalid_argument(tonic_status_messages::INVALID_MESSAGE_FORMAT)
    })?;

  if !constant_time_eq(
    deserialized_message.statement.as_bytes(),
    expected_statement,
  ) {
    return Err(Status::invalid_argument(
      tonic_status_messages::INVALID_MESSAGE,
    ));
  }

  let issued_at: DateTime<Utc> =
    deserialized_message.issued_at.parse().map_err(|_| {
      Status::invalid_argument(tonic_status_messages::INVALID_MESSAGE_FORMAT)
    })?;

  let now = Utc::now();
  if (now - issued_at).num_seconds() > 5 {
    return Err(Status::invalid_argument(
      tonic_status_messages::INVALID_MESSAGE,
    ));
  }

  let public_key_string =
    CONFIG.keyserver_public_key.as_deref().ok_or_else(|| {
      Status::failed_precondition(tonic_status_messages::MISSING_KEY)
    })?;

  crate::grpc_utils::ed25519_verify(
    public_key_string,
    keyserver_message.as_bytes(),
    keyserver_signature,
  )?;

  Ok(deserialized_message)
}

pub fn validate_account_ownership_message_and_get_user_id(
  username: &str,
  keyserver_message: &str,
  keyserver_signature: &str,
) -> Result<String, Status> {
  // Note that username in this context includes wallet addresses, too.
  const EXPECTED_STATEMENT: &[u8; 60] =
    b"This user is the owner of the following username and user ID";

  let deserialized_message = validate_and_decode_message::<UserDetail>(
    keyserver_message,
    keyserver_signature,
    EXPECTED_STATEMENT,
  )?;

  if deserialized_message.payload.username != username {
    return Err(Status::invalid_argument(
      tonic_status_messages::INVALID_MESSAGE,
    ));
  }

  Ok(deserialized_message.payload.user_id)
}

pub fn validate_add_reserved_usernames_message(
  keyserver_message: &str,
  keyserver_signature: &str,
) -> Result<Vec<UserDetail>, Status> {
  let deserialized_message = validate_and_decode_message::<Vec<UserDetail>>(
    keyserver_message,
    keyserver_signature,
    b"Add the following usernames to reserved list",
  )?;

  Ok(deserialized_message.payload)
}

pub fn validate_remove_reserved_username_message(
  keyserver_message: &str,
  keyserver_signature: &str,
) -> Result<String, Status> {
  let deserialized_message = validate_and_decode_message::<String>(
    keyserver_message,
    keyserver_signature,
    b"Remove the following username from reserved list",
  )?;

  Ok(deserialized_message.payload)
}
