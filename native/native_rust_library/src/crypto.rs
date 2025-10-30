use base64::DecodeError::InvalidPadding;
use serde_json::to_string;
use tokio::net::unix::pid_t;
use vodozemac::olm::{OlmMessage, Session, SessionPickle};
use vodozemac::PickleError;

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
  encrypted_message: &[u8],
  message_type: u32,
  session_key: String,
) -> Result<(String, String), String> {
  println!("=== decrypt_with_vodozemac START ===");

  let key_bytes = session_key.as_bytes();
  println!("Session key: {:?}", session_key);
  println!("Session key length: {} bytes", key_bytes.len());

  println!("Creating 32-byte key slice...");
  let key: &[u8; 32] = &key_bytes[0..32]
    .try_into()
    .expect("String must be at least 32 bytes");
  println!("32-byte key created successfully");

  println!("Attempting SessionPickle::from_encrypted...");
  let session_pickle =
    match SessionPickle::from_encrypted(session_state.as_str(), key) {
      Ok(pickle) => {
        println!("SessionPickle::from_encrypted succeeded");
        Some(pickle)
      }
      Err(e) => {
        println!("SessionPickle::from_encrypted failed: {:?}", e);
        match e {
          PickleError::Base64(base64_error) => {
            return Err(base64_error.to_string());
          }
          //TODO: improve this, but module is private
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

  println!("Creating session...");
  let mut session = if let Some(pickle) = session_pickle {
    println!("Using Session::from_pickle");
    Session::from_pickle(pickle)
  } else {
    println!("Using Session::from_libolm_pickle with 64-byte key");
    println!("Session state length: {} chars", session_state.len());
    println!("Session state content: {:?}", session_state);
    println!(
      "Encrypted message length: {} bytes",
      encrypted_message.len()
    );
    Session::from_libolm_pickle(&session_state, key).map_err(|e| {
      println!("Session::from_libolm_pickle failed: {}", e);
      e.to_string()
    })?
  };
  println!("Session created successfully");

  println!("Creating OlmMessage...");
  let olm_message =
    OlmMessage::from_parts(message_type as usize, encrypted_message).map_err(
      |e| {
        println!("OlmMessage::from_parts failed: {}", e);
        e.to_string()
      },
    )?;
  println!("OlmMessage created successfully");

  println!("Attempting to decrypt...");
  let result = session.decrypt(&olm_message).map_err(|e| {
    println!("session.decrypt failed: {}", e);
    e.to_string()
  })?;
  println!(
    "Decryption successful, result length: {} bytes",
    result.len()
  );

  println!("Pickling session...");
  let update_session_pickle = session.pickle();
  println!("Session pickled successfully");

  println!("Encrypting pickled session...");
  let updated_session = update_session_pickle.encrypt(key);
  println!("Pickled session encrypted successfully");

  println!("Converting result to UTF-8...");
  let plaintext = String::from_utf8(result).expect("Invalid UTF-8");
  println!("UTF-8 conversion successful");

  println!("=== decrypt_with_vodozemac SUCCESS ===");
  Ok((plaintext, updated_session))
}

/// CXX-compatible version of decrypt_with_vodozemac
/// Returns DecryptResult struct defined in the ffi module
/// Throws std::runtime_error on failure (caught as cxx::Exception in C++)
pub fn decrypt_with_vodozemac_cxx(
  session_state: String,
  encrypted_message: &[u8],
  message_type: u32,
  session_key: String,
) -> crate::ffi::DecryptResult {
  let (message, state) = decrypt_with_vodozemac(
    session_state,
    encrypted_message,
    message_type,
    session_key,
  )
  .unwrap_or_else(|e| {
    println!("Error in decrypt_with_vodozemac: {}", e);
    panic!("decrypt_with_vodozemac failed: {}", e);
  });

  crate::ffi::DecryptResult {
    decrypted_message: message,
    updated_session_state: state,
  }
}
