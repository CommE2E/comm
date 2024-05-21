use base64::Engine;
use ed25519_dalek::{ed25519::signature::Signer, Keypair, Signature};
use rand::rngs::OsRng;

use self::olm_account_infos::{
  ClientPublicKeys, IdentityPublicKeys, DEFAULT_CLIENT_KEYS,
};

pub mod device;
pub mod olm_account_infos;

pub struct SigningCapableAccount {
  signing_key: Keypair,
}

impl SigningCapableAccount {
  pub fn new() -> Self {
    let mut rng = OsRng {};
    let signing_key = Keypair::generate(&mut rng);
    Self { signing_key }
  }

  /// returns device public keys, required for device key upload
  pub fn public_keys(&self) -> ClientPublicKeys {
    let default = DEFAULT_CLIENT_KEYS.clone();
    let signing_public_key = self.signing_key.public.to_bytes();
    let ed25519 = base64::engine::general_purpose::STANDARD_NO_PAD
      .encode(signing_public_key);

    ClientPublicKeys {
      primary_identity_public_keys: IdentityPublicKeys {
        ed25519,
        ..default.primary_identity_public_keys
      },
      ..default
    }
  }

  /// signs message, returns signature
  pub fn sign_message(&self, message: &str) -> String {
    let signature: Signature = self.signing_key.sign(message.as_bytes());
    base64::engine::general_purpose::STANDARD_NO_PAD
      .encode(signature.to_bytes())
  }
}

impl Default for SigningCapableAccount {
  fn default() -> Self {
    Self::new()
  }
}
