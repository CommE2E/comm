use sha2::{Digest, Sha256};
use vodozemac::olm::{Account, AccountPickle, Session, SessionPickle};
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

pub fn encrypt_result_new(
  encrypted_message: String,
  message_type: u32,
) -> Box<EncryptResult> {
  Box::new(EncryptResult {
    encrypted_message,
    message_type,
  })
}

impl EncryptResult {
  pub fn encrypted_message(&self) -> String {
    self.encrypted_message.clone()
  }

  pub fn message_type(&self) -> u32 {
    self.message_type
  }
}

impl TryFrom<&EncryptResult> for olm::OlmMessage {
  type Error = anyhow::Error;

  fn try_from(message: &EncryptResult) -> Result<Self, Self::Error> {
    match message.message_type {
      0 => {
        let prekey =
          olm::PreKeyMessage::from_base64(&message.encrypted_message)?;
        Ok(prekey.into())
      }
      1 => {
        let msg = olm::Message::from_base64(&message.encrypted_message)?;
        Ok(msg.into())
      }
      _ => anyhow::bail!("Invalid message type: {}", message.message_type),
    }
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
    let encrypted_result = EncryptResult {
      encrypted_message,
      message_type,
    };
    let olm_message: olm::OlmMessage = (&encrypted_result)
      .try_into()
      .map_err(|e: anyhow::Error| e.to_string())?;

    let result = self.0.decrypt(&olm_message).map_err(|e| e.to_string())?;
    let plaintext = String::from_utf8(result).expect("Invalid UTF-8");

    Ok(plaintext)
  }

  pub fn has_received_message(&self) -> bool {
    self.0.has_received_message()
  }

  pub fn is_sender_chain_empty(&self) -> bool {
    self.0.is_sender_chain_empty()
  }
}

pub fn session_from_pickle(
  session_state: String,
  session_key: String,
) -> Result<Box<VodozemacSession>, String> {
  let key_bytes = session_key.as_bytes();

  // NOTE: vodozemac works only with 32-byte keys.
  // We have sessions pickled with 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  let key: &[u8; 32] = &key_bytes[0..32]
    .try_into()
    .expect("String must be at least 32 bytes");

  let session_pickle =
    match SessionPickle::from_encrypted(session_state.as_str(), key) {
      Ok(pickle) => Some(pickle),
      Err(e) => match e {
        PickleError::Base64(base64_error) => {
          return Err(base64_error.to_string());
        }
        PickleError::Decryption(_) => None,
        PickleError::Serialization(serialization_error) => {
          return Err(serialization_error.to_string());
        }
      },
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

pub struct InboundCreationResult {
  session: Option<VodozemacSession>,
  plaintext: String,
}

impl From<vodozemac::olm::InboundCreationResult> for InboundCreationResult {
  fn from(result: vodozemac::olm::InboundCreationResult) -> Self {
    InboundCreationResult {
      session: Some(VodozemacSession(result.session)),
      plaintext: String::from_utf8(result.plaintext)
        .expect("Invalid UTF-8 in plaintext"),
    }
  }
}

impl InboundCreationResult {
  pub fn plaintext(&self) -> String {
    self.plaintext.clone()
  }

  pub fn take_session(&mut self) -> Box<VodozemacSession> {
    Box::new(self.session.take().expect("Session has already been taken"))
  }
}

pub struct VodozemacAccount(pub(crate) vodozemac::olm::Account);

impl From<Account> for VodozemacAccount {
  fn from(account: Account) -> Self {
    VodozemacAccount(account)
  }
}

impl VodozemacAccount {
  pub fn pickle(&self, pickle_key: &[u8; 32]) -> String {
    self.0.pickle().encrypt(pickle_key)
  }

  pub fn ed25519_key(&self) -> String {
    self.0.ed25519_key().to_base64()
  }

  pub fn curve25519_key(&self) -> String {
    self.0.curve25519_key().to_base64()
  }

  pub fn sign(&self, message: &str) -> String {
    self.0.sign(message).to_base64()
  }

  pub fn generate_one_time_keys(&mut self, count: usize) {
    self.0.generate_one_time_keys(count);
  }

  pub fn one_time_keys(&self) -> Vec<String> {
    self
      .0
      .one_time_keys()
      .into_values()
      .map(|v| v.to_base64())
      .collect()
  }

  pub fn mark_keys_as_published(&mut self) {
    self.0.mark_keys_as_published()
  }

  pub fn max_number_of_one_time_keys(&self) -> usize {
    self.0.max_number_of_one_time_keys()
  }

  pub fn mark_prekey_as_published(&mut self) -> bool {
    self.0.mark_prekey_as_published()
  }

  pub fn generate_prekey(&mut self) {
    self.0.generate_prekey()
  }

  pub fn forget_old_prekey(&mut self) {
    self.0.forget_old_prekey()
  }

  pub fn last_prekey_publish_time(&mut self) -> u64 {
    self.0.get_last_prekey_publish_time()
  }

  pub fn prekey(&self) -> String {
    self
      .0
      .prekey()
      .map(|key| key.to_base64())
      .unwrap_or_default()
  }

  pub fn unpublished_prekey(&self) -> String {
    self
      .0
      .unpublished_prekey()
      .map(|key| key.to_base64())
      .unwrap_or_default()
  }

  pub fn prekey_signature(&self) -> String {
    self.0.get_prekey_signature().unwrap_or_default()
  }

  pub fn create_outbound_session(
    &self,
    identity_key: &str,
    signing_key: &str,
    one_time_key: &str,
    pre_key: &str,
    pre_key_signature: &str,
    olm_compatibility_mode: bool,
  ) -> Result<Box<VodozemacSession>, String> {
    let session_config = vodozemac::olm::SessionConfig::version_1();
    let identity_key =
      vodozemac::Curve25519PublicKey::from_base64(identity_key)
        .map_err(|e| e.to_string())?;
    let signing_key = vodozemac::Ed25519PublicKey::from_base64(signing_key)
      .map_err(|e| e.to_string())?;
    // NOTE: We use an empty string to represent None because cxx doesn't
    // support Option<&str> in FFI function signatures.
    let one_time_key = if one_time_key.is_empty() {
      None
    } else {
      Some(
        vodozemac::Curve25519PublicKey::from_base64(one_time_key)
          .map_err(|e| e.to_string())?,
      )
    };
    let pre_key = vodozemac::Curve25519PublicKey::from_base64(pre_key)
      .map_err(|e| e.to_string())?;

    let session = self
      .0
      .create_outbound_session(
        session_config,
        identity_key,
        signing_key,
        one_time_key,
        pre_key,
        pre_key_signature.to_string(),
        olm_compatibility_mode,
      )
      .map_err(|e| e.to_string())?;

    Ok(Box::new(VodozemacSession(session)))
  }

  pub fn create_inbound_session(
    &mut self,
    identity_key: &str,
    message: &EncryptResult,
  ) -> Result<Box<InboundCreationResult>, String> {
    let identity_key =
      vodozemac::Curve25519PublicKey::from_base64(identity_key)
        .map_err(|e| e.to_string())?;
    let olm_message: olm::OlmMessage = message
      .try_into()
      .map_err(|e: anyhow::Error| e.to_string())?;

    if let olm::OlmMessage::PreKey(message) = olm_message {
      Ok(Box::new(
        self
          .0
          .create_inbound_session(identity_key, &message)
          .map_err(|e| e.to_string())?
          .into(),
      ))
    } else {
      Err("Invalid message type, a pre-key message is required".to_string())
    }
  }
}

pub fn account_new() -> Box<VodozemacAccount> {
  let account = Account::new();
  Box::new(VodozemacAccount(account))
}

pub fn account_from_pickle(
  account_state: String,
  account_key: String,
) -> Result<Box<VodozemacAccount>, String> {
  let key_bytes = account_key.as_bytes();

  // NOTE: vodozemac works only with 32-byte keys.
  // We have sessions pickled with 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  let key: &[u8; 32] = &key_bytes[0..32]
    .try_into()
    .expect("String must be at least 32 bytes");

  let account_pickle =
    match AccountPickle::from_encrypted(account_state.as_str(), key) {
      Ok(pickle) => Some(pickle),
      Err(e) => match e {
        PickleError::Base64(base64_error) => {
          return Err(base64_error.to_string());
        }
        PickleError::Decryption(_) => None,
        PickleError::Serialization(serialization_error) => {
          return Err(serialization_error.to_string());
        }
      },
    };

  let account: VodozemacAccount = if let Some(pickle) = account_pickle {
    Account::from_pickle(pickle).into()
  } else {
    Account::from_libolm_pickle(&account_state, account_key.as_bytes())
      .map_err(|e| e.to_string())?
      .into()
  };

  Ok(Box::from(account))
}

pub fn verify_ed25519_signature(
  public_key: &str,
  message: &str,
  signature: &str,
) -> Result<(), String> {
  let public_key = vodozemac::Ed25519PublicKey::from_base64(public_key)
    .map_err(|e| e.to_string())?;

  let signature = vodozemac::Ed25519Signature::from_base64(signature)
    .map_err(|e| e.to_string())?;

  public_key
    .verify(message.as_bytes(), &signature)
    .map_err(|e| e.to_string())
}

pub fn verify_prekey_signature(
  public_key: &str,
  prekey_base64: &str,
  signature: &str,
) -> Result<(), String> {
  let public_key = vodozemac::Ed25519PublicKey::from_base64(public_key)
    .map_err(|e| e.to_string())?;

  let signature = vodozemac::Ed25519Signature::from_base64(signature)
    .map_err(|e| e.to_string())?;

  // Decode the base64 prekey to raw bytes for verification
  let prekey_bytes =
    vodozemac::base64_decode(prekey_base64).map_err(|e| e.to_string())?;

  public_key
    .verify(&prekey_bytes, &signature)
    .map_err(|e| e.to_string())
}

pub fn sha256(input: &[u8]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(&input);
  let hash = hasher.finalize();

  vodozemac::base64_encode(hash)
}
