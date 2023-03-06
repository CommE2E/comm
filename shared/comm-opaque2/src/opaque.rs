use argon2::Argon2;
use opaque_ke::ciphersuite::CipherSuite;

pub struct Cipher;

impl CipherSuite for Cipher {
  type OprfCs = opaque_ke::Ristretto255;
  type KeGroup = opaque_ke::Ristretto255;
  type KeyExchange = opaque_ke::key_exchange::tripledh::TripleDh;
  type Ksf = Argon2<'static>;
}
