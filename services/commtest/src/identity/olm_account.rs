use base64::Engine;
use ed25519_dalek::{ed25519::signature::Signer, Keypair, Signature};
use rand::{distributions::Alphanumeric, rngs::OsRng, Rng};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IdentityPublicKeys {
  pub ed25519: String,
  pub curve25519: String,
}

/// Represents device's identity key info
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClientPublicKeys {
  pub primary_identity_public_keys: IdentityPublicKeys,
  pub notification_identity_public_keys: IdentityPublicKeys,
}

impl ClientPublicKeys {
  /// Generates random keys with given `ed25519` primary account
  /// signing public key. Use [`ClientPublicKeys::default`] for random key.
  pub fn new(primary_signing_public_key: impl Into<String>) -> Self {
    Self {
      primary_identity_public_keys: IdentityPublicKeys {
        ed25519: primary_signing_public_key.into(),
        curve25519: generate_random_olm_key(),
      },
      notification_identity_public_keys: IdentityPublicKeys {
        ed25519: generate_random_olm_key(),
        curve25519: generate_random_olm_key(),
      },
    }
  }

  pub fn device_id(&self) -> &str {
    &self.primary_identity_public_keys.ed25519
  }
}

impl Default for ClientPublicKeys {
  fn default() -> Self {
    Self::new(generate_random_olm_key())
  }
}

/// Struct that simulates Olm account
pub struct MockOlmAccount {
  // primary account ed25519 keypair
  signing_key: Keypair,
}

impl MockOlmAccount {
  pub fn new() -> Self {
    let mut rng = OsRng {};
    let signing_key = Keypair::generate(&mut rng);
    Self { signing_key }
  }

  /// returns device public keys, required for device key upload
  pub fn public_keys(&self) -> ClientPublicKeys {
    let signing_public_key = self.signing_key.public.to_bytes();
    let ed25519 = base64::engine::general_purpose::STANDARD_NO_PAD
      .encode(signing_public_key);

    ClientPublicKeys::new(ed25519)
  }

  /// signs message, returns signature
  pub fn sign_message(&self, message: &str) -> String {
    let signature: Signature = self.signing_key.sign(message.as_bytes());
    base64::engine::general_purpose::STANDARD_NO_PAD
      .encode(signature.to_bytes())
  }
}

impl Default for MockOlmAccount {
  fn default() -> Self {
    Self::new()
  }
}

/// Generates random 43-character ahlpanumeric string.
/// It simulates 32-byte (256bit) long base64-encoded data.
pub fn generate_random_olm_key() -> String {
  rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(43)
    .map(char::from)
    .collect()
}
