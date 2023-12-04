use aead::{
  generic_array::GenericArray, Aead, AeadCore, AeadInPlace, KeyInit, OsRng,
};
use aes_gcm::Aes256Gcm;
use aws_sdk_dynamodb::types::AttributeValue;
use bytes::BytesMut;

use crate::database::{DBItemError, TryFromAttribute};

pub use aes_gcm::Error as AES256Error;

const TAG_LEN: usize = 16;
const NONCE_LEN: usize = 12;

#[derive(Clone, Debug, derive_more::From, derive_more::AsRef)]
pub struct EncryptionKey(aes_gcm::Key<Aes256Gcm>);

impl EncryptionKey {
  /// Generates a new AES256 key.
  pub fn new() -> EncryptionKey {
    Aes256Gcm::generate_key(&mut OsRng).into()
  }
}

impl Default for EncryptionKey {
  fn default() -> Self {
    Self::new()
  }
}

// database conversions
impl From<EncryptionKey> for AttributeValue {
  fn from(key: EncryptionKey) -> Self {
    use aws_sdk_dynamodb::primitives::Blob;
    AttributeValue::B(Blob::new(key.0.to_vec()))
  }
}
impl TryFromAttribute for EncryptionKey {
  fn try_from_attr(
    attribute_name: impl Into<String>,
    attribute: Option<AttributeValue>,
  ) -> Result<Self, DBItemError> {
    let bytes = Vec::<u8>::try_from_attr(attribute_name, attribute)?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&bytes);
    Ok(Self(*key))
  }
}

/// Encrypts a plaintext with the given key. Returns the sealed data
/// in the following format: nonce || ciphertext || tag
pub fn encrypt(
  plaintext: &[u8],
  key: &EncryptionKey,
) -> Result<Vec<u8>, AES256Error> {
  let cipher = Aes256Gcm::new(key.as_ref());
  let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

  // Construct an output buffer: nonce || ciphertext || tag
  // Then split it into nonce and ciphertext || tag,
  // encrypt and concatenate again.
  // This is done on contiguous memory to avoid extra allocations.

  let mut output =
    BytesMut::with_capacity(nonce.len() + plaintext.len() + TAG_LEN);
  output.extend_from_slice(&nonce);
  output.extend_from_slice(plaintext);

  let mut buffer = output.split_off(nonce.len());
  cipher.encrypt_in_place(&nonce, b"", &mut buffer)?;
  output.unsplit(buffer);

  Ok(output.into())
}

/// Decrypts a ciphertext with the given key. Expects the sealed data
/// in the following format: nonce || ciphertext || tag
pub fn decrypt(
  ciphertext: &[u8],
  key: &EncryptionKey,
) -> Result<Vec<u8>, AES256Error> {
  if ciphertext.len() < NONCE_LEN + TAG_LEN {
    return Err(AES256Error);
  }
  let cipher = Aes256Gcm::new(key.as_ref());
  let nonce = GenericArray::from_slice(&ciphertext[..NONCE_LEN]);
  cipher.decrypt(nonce, &ciphertext[NONCE_LEN..])
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_aes256() {
    let key = EncryptionKey::new();
    let plaintext = b"hello world";
    let ciphertext = encrypt(plaintext, &key).expect("Encrypt failed");
    let decrypted = decrypt(&ciphertext, &key).expect("Decrypt failed");
    assert_eq!(plaintext, &decrypted[..]);
  }

  #[test]
  fn test_aes256_invalid_key() {
    let key = EncryptionKey::new();
    let plaintext = b"hello world";
    let ciphertext = encrypt(plaintext, &key).expect("Encrypt failed");

    let other_key = EncryptionKey::new();
    decrypt(&ciphertext, &other_key).expect_err("Decrypt should fail");
  }

  #[test]
  fn test_aes256_malfolmed() {
    let key = EncryptionKey::new();
    let plaintext = b"hello world";
    let mut ciphertext = encrypt(plaintext, &key).expect("Encrypt failed");

    ciphertext[0] ^= 0xaa; // do the flip

    decrypt(&ciphertext, &key).expect_err("Decrypt should fail");
  }
}
