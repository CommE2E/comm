use curve25519_dalek::ristretto::RistrettoPoint;
use log::error;
use once_cell::sync::Lazy;
use opaque_ke::{
  ciphersuite::CipherSuite, errors::InternalPakeError, keypair::KeyPair,
};
use rand::rngs::OsRng;
use std::{env, fs, path::Path};

use crate::{
  constants::{SECRETS_DIRECTORY, SECRETS_FILE_EXTENSION, SECRETS_FILE_NAME},
  Cipher,
};

pub static CONFIG: Lazy<Config> =
  Lazy::new(|| Config::load().expect("failed to load config"));

#[allow(dead_code)]
pub(super) fn load_config() {
  Lazy::force(&CONFIG);
}

#[derive(Clone)]
pub struct Config {
  pub server_keypair: KeyPair<RistrettoPoint>,
}

impl Config {
  fn load() -> Result<Self, InternalPakeError> {
    let mut path = env::current_dir().expect("Failed to determine CWD");
    path.push(SECRETS_DIRECTORY);
    path.push(SECRETS_FILE_NAME);
    path.set_extension(SECRETS_FILE_EXTENSION);
    let keypair = get_keypair_from_file(path)?;
    Ok(Self {
      server_keypair: keypair,
    })
  }
}

fn get_keypair_from_file<P: AsRef<Path>>(
  path: P,
) -> Result<KeyPair<RistrettoPoint>, InternalPakeError> {
  let maybe_bytes = fs::read(path);
  match maybe_bytes {
    Ok(bytes) => KeyPair::from_private_key_slice(&bytes),
    Err(_) => {
      error!("Unable to load secrets file");
      return Ok(Cipher::generate_random_keypair(&mut OsRng));
    }
  }
}
