use base64::Engine;
use ed25519_dalek::{ed25519::signature::Signer, Keypair, Signature};
use rand::{distributions::Alphanumeric, rngs::OsRng, Rng};
use serde::{Deserialize, Serialize};

use grpc_clients::identity::protos::unauth::Prekey as GrpcPrekey;

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
  pub fn new(
    primary_signing_public_key: impl Into<String>,
    notif_signing_public_key: Option<String>,
  ) -> Self {
    Self {
      primary_identity_public_keys: IdentityPublicKeys {
        ed25519: primary_signing_public_key.into(),
        curve25519: generate_random_olm_key(),
      },
      notification_identity_public_keys: IdentityPublicKeys {
        ed25519: notif_signing_public_key
          .unwrap_or_else(generate_random_olm_key),
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
    Self::new(generate_random_olm_key(), None)
  }
}

#[derive(Default)]
pub enum AccountType {
  #[default]
  Content,
  Notif,
}

/// Struct that simulates client Olm account.
/// Specifically it represents a pair of Content and Notif accounts.
pub struct MockOlmAccount {
  // primary account ed25519 keypair
  content_keypair: Keypair,
  notif_keypair: Keypair,
}

impl MockOlmAccount {
  pub fn new() -> Self {
    let mut rng = OsRng {};
    let content_keypair = Keypair::generate(&mut rng);
    let notif_keypair = Keypair::generate(&mut rng);
    Self {
      content_keypair,
      notif_keypair,
    }
  }

  /// returns device public keys, required for device key upload
  pub fn public_keys(&self) -> ClientPublicKeys {
    let base64_engine = &base64::engine::general_purpose::STANDARD_NO_PAD;

    let signing_public_key = self.content_keypair.public.to_bytes();
    let content_ed25519 = base64_engine.encode(signing_public_key);

    let notif_public_key = self.notif_keypair.public.to_bytes();
    let notif_ed25519 = base64_engine.encode(notif_public_key);

    ClientPublicKeys::new(content_ed25519, Some(notif_ed25519))
  }

  /// signs message with Content Olm account, returns signature
  pub fn sign_message(&self, message: &str) -> String {
    self.sign_message_with_account(message, AccountType::Content)
  }

  /// signs message, returns signature
  pub fn sign_message_with_account(
    &self,
    message: &str,
    account: AccountType,
  ) -> String {
    let keypair: &Keypair = match account {
      AccountType::Content => &self.content_keypair,
      AccountType::Notif => &self.notif_keypair,
    };
    let signature: Signature = keypair.sign(message.as_bytes());
    base64::engine::general_purpose::STANDARD_NO_PAD
      .encode(signature.to_bytes())
  }

  /// generates random prekey with valid signature
  pub fn generate_prekey(&self, account: AccountType) -> GrpcPrekey {
    let prekey = generate_random_olm_key();
    let prekey_signature = self.sign_message_with_account(&prekey, account);
    GrpcPrekey {
      prekey,
      prekey_signature,
    }
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
