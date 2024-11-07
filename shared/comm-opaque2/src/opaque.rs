use generic_array::{ArrayLength, GenericArray};
use opaque_ke::ciphersuite::CipherSuite;
use opaque_ke::errors::InternalError;

pub struct Cipher;

impl CipherSuite for Cipher {
  type OprfCs = opaque_ke::Ristretto255;
  type KeGroup = opaque_ke::Ristretto255;
  type KeyExchange = opaque_ke::key_exchange::tripledh::TripleDh;
  type Ksf = Argon2_4096_3_1;
}

pub struct Argon2_4096_3_1 {
  inner: argon2::Argon2<'static>,
}
impl Default for Argon2_4096_3_1 {
  fn default() -> Self {
    Self {
      inner: argon2::Argon2::new(
        argon2::Algorithm::default(),
        argon2::Version::default(),
        argon2::Params::new(4096, 3, 1, None).unwrap(),
      ),
    }
  }
}
impl opaque_ke::ksf::Ksf for Argon2_4096_3_1 {
  fn hash<L: ArrayLength<u8>>(
    &self,
    input: GenericArray<u8, L>,
  ) -> Result<GenericArray<u8, L>, InternalError> {
    self.inner.hash(input)
  }
}
