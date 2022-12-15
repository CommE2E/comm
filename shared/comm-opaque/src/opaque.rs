use argon2::Argon2;
use digest::{generic_array::GenericArray, Digest};
use opaque_ke::{
  ciphersuite::CipherSuite, errors::InternalPakeError, hash::Hash,
  slow_hash::SlowHash,
};

pub struct Cipher;

impl CipherSuite for Cipher {
  type Group = curve25519_dalek::ristretto::RistrettoPoint;
  type KeyExchange = opaque_ke::key_exchange::tripledh::TripleDH;
  type Hash = sha2::Sha512;
  type SlowHash = ArgonWrapper;
}

pub struct ArgonWrapper(Argon2<'static>);

impl<D: Hash> SlowHash<D> for ArgonWrapper {
  fn hash(
    input: GenericArray<u8, <D as Digest>::OutputSize>,
  ) -> Result<Vec<u8>, InternalPakeError> {
    let params = Argon2::default();
    let mut output = vec![0u8; <D as Digest>::output_size()];
    params
      .hash_password_into(&input, &[0; argon2::MIN_SALT_LEN], &mut output)
      .map_err(|_| InternalPakeError::SlowHashError)?;
    Ok(output)
  }
}
