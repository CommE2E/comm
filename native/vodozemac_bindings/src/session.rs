use vodozemac::olm::{Session, SessionPickle};
use vodozemac::{olm, PickleError};

pub struct VodozemacSession(pub(crate) vodozemac::olm::Session);

impl From<Session> for VodozemacSession {
  fn from(session: Session) -> Self {
    VodozemacSession(session)
  }
}

pub struct EncryptResult {
  pub encrypted_message: String,
  pub message_type: u32,
}

impl EncryptResult {
  pub fn encrypted_message(&self) -> String {
    self.encrypted_message.clone()
  }

  pub fn message_type(&self) -> u32 {
    self.message_type
  }
}

impl VodozemacSession {
  pub fn pickle(&self, pickle_key: &[u8; 32]) -> String {
    self.0.pickle().encrypt(pickle_key)
  }

  pub fn encrypt(
    &mut self,
    plaintext: &str,
  ) -> Result<Box<EncryptResult>, String> {
    let olm_message = self.0.encrypt(plaintext.as_bytes());

    let (message_type, encrypted_message) = match olm_message {
      olm::OlmMessage::Normal(msg) => (1, msg.to_base64()),
      olm::OlmMessage::PreKey(msg) => (0, msg.to_base64()),
    };

    Ok(Box::from(EncryptResult {
      encrypted_message,
      message_type: message_type as u32,
    }))
  }

  pub fn decrypt(
    &mut self,
    encrypted_message: String,
    message_type: u32,
  ) -> Result<String, String> {
    let olm_message: vodozemac::olm::OlmMessage = match message_type {
      0 => olm::PreKeyMessage::from_base64(encrypted_message.as_str())
        .map_err(|e| e.to_string())?
        .into(),
      1 => olm::Message::from_base64(encrypted_message.as_str())
        .map_err(|e| e.to_string())?
        .into(),
      _ => return Err("wrong message type".to_string()),
    };

    let result = self.0.decrypt(&olm_message).map_err(|e| e.to_string())?;
    let plaintext = String::from_utf8(result).expect("Invalid UTF-8");

    Ok(plaintext)
  }
}

pub fn session_from_pickle(
  session_state: String,
  session_key: String,
) -> Result<Box<VodozemacSession>, String> {
  let key_bytes = session_key.as_bytes();

  //NOTE: vvodozemac works only with 32-byte keys.
  // We have sessions pickled with 64-byte keys. Additionally, this key
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

  let session: VodozemacSession = if let Some(pickle) = session_pickle {
    Session::from_pickle(pickle).into()
  } else {
    Session::from_libolm_pickle(&session_state, session_key.as_bytes())
      .map_err(|e| e.to_string())?
      .into()
  };

  Ok(Box::from(session))
}
