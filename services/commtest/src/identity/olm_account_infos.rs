use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IdentityPublicKeys {
  pub ed25519: String,
  pub curve25519: String,
}

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

pub fn generate_random_olm_key() -> String {
  rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(43)
    .map(char::from)
    .collect()
}
