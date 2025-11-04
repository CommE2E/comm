use vodozemac::olm::{MessageType, OlmMessage, Session, SessionPickle};
use vodozemac::{olm, PickleError};

/// Helper function to create a session from state and key
/// Handles both vodozemac pickle format and libolm pickle format
fn create_session_from_state(
  session_state: String,
  session_key: String,
) -> Result<Session, String> {
  let key_bytes = session_key.as_bytes();

  //NOTE: vvodozemac works only with 32-byte keys.
  // We have sessions pickled with 64 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  let key: &[u8; 32] = &key_bytes[0..32]
    .try_into()
    .expect("String must be at least 32 bytes");

  let session_pickle =
    match SessionPickle::from_encrypted(session_state.as_str(), key) {
      Ok(pickle) => Some(pickle),
      Err(e) => {
        match e {
          PickleError::Base64(base64_error) => {
            return Err(base64_error.to_string());
          }
          //TODO: Use only specific error type
          PickleError::Decryption(_) => {
            println!("Decryption error, will try from_libolm_pickle");
            None
          }
          PickleError::Serialization(serialization_error) => {
            return Err(serialization_error.to_string());
          }
        }
      }
    };

  let session = if let Some(pickle) = session_pickle {
    Session::from_pickle(pickle)
  } else {
    Session::from_libolm_pickle(&session_state, session_key.as_bytes())
      .map_err(|e| e.to_string())?
  };
  println!("Session created successfully");

  Ok(session)
}

/// Helper function to save session state
/// Returns the encrypted session state string
fn save_session_state(
  session: Session,
  session_key: String,
) -> Result<String, String> {
  //NOTE: vvodozemac works only with 32-byte keys.
  // We have sessions pickled with 64 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  let key_bytes = session_key.as_bytes();
  let key: &[u8; 32] = &key_bytes[0..32]
    .try_into()
    .expect("String must be at least 32 bytes");

  let update_session_pickle = session.pickle();
  let updated_session = update_session_pickle.encrypt(key);

  Ok(updated_session)
}

/// Decrypt a message using vodozemac with libolm compatibility
///
/// This function:
/// 1. Unpickles the libolm session using unpickle_libolm()
/// 2. Decrypts the message (which mutates the session)
/// 3. Re-pickles the session using pickle_libolm() for compatibility
///
/// The C++ code can continue using the returned state with existing Olm sessions.
pub fn decrypt_with_vodozemac(
  session_state: String,
  encrypted_message: String,
  message_type: u32,
  session_key: String,
  //TODO: check if errors work
) -> Result<crate::ffi::DecryptResult, String> {
  let mut session =
    create_session_from_state(session_state, session_key.clone())?;

  let olm_message: OlmMessage = match message_type {
    0 => olm::PreKeyMessage::from_base64(encrypted_message.as_str())
      .map_err(|e| e.to_string())?
      .into(),
    1 => olm::Message::from_base64(encrypted_message.as_str())
      .map_err(|e| e.to_string())?
      .into(),
    _ => return Err("wrong message type".to_string()),
  };

  let result = session.decrypt(&olm_message).map_err(|e| e.to_string())?;

  let updated_session = save_session_state(session, session_key)?;
  let plaintext = String::from_utf8(result).expect("Invalid UTF-8");

  Ok(crate::ffi::DecryptResult {
    decrypted_message: plaintext,
    updated_session_state: updated_session,
  })
}

/// Encrypt a message using vodozemac with libolm compatibility
///
/// This function:
/// 1. Unpickles the libolm session using unpickle_libolm()
/// 2. Encrypts the message (which mutates the session)
/// 3. Re-pickles the session using pickle_libolm() for compatibility
///
/// The C++ code can continue using the returned state with existing Olm sessions.
pub fn encrypt_with_vodozemac(
  session_state: String,
  plaintext: String,
  session_key: String,
  //TODO: check if errors work
) -> Result<crate::ffi::EncryptResult, String> {
  let mut session =
    create_session_from_state(session_state, session_key.clone())?;
  let olm_message = session.encrypt(plaintext.as_bytes());

  let (message_type, encrypted_message) = match olm_message {
    OlmMessage::Normal(msg) => (1, msg.to_base64()),
    OlmMessage::PreKey(msg) => (0, msg.to_base64()),
  };

  let updated_session = save_session_state(session, session_key)?;

  Ok(crate::ffi::EncryptResult {
    encrypted_message,
    message_type: message_type as u32,
    updated_session_state: updated_session,
  })
}

pub fn encrypt_with_vodozemac2(
  session_state: String,
  plaintext: String,
  session_key: String,
  //TODO: check if errors work
) -> Result<crate::ffi::EncryptResult, String> {
  let mut session =
      create_session_from_state(session_state, session_key.clone())?;
  let olm_message = session.encrypt(plaintext.as_bytes());

  let (message_type, encrypted_message) = match olm_message {
    OlmMessage::Normal(msg) => (1, msg.to_base64()),
    OlmMessage::PreKey(msg) => (0, msg.to_base64()),
  };

  let updated_session = save_session_state(session, session_key)?;

  Ok(crate::ffi::EncryptResult {
    encrypted_message,
    message_type: message_type as u32,
    updated_session_state: updated_session,
  })
}