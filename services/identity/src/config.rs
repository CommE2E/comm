use curve25519_dalek::ristretto::RistrettoPoint;
use once_cell::sync::Lazy;
use opaque_ke::{errors::PakeError, keypair::KeyPair};
use std::{env, fmt, fs, io, path::Path};

use crate::constants::{
  AUTH_TOKEN, SECRETS_DIRECTORY, SECRETS_FILE_EXTENSION, SECRETS_FILE_NAME,
};

pub static CONFIG: Lazy<Config> =
  Lazy::new(|| Config::load().expect("failed to load config"));

pub(super) fn load_config() {
  Lazy::force(&CONFIG);
}

#[derive(Clone)]
pub struct Config {
  pub server_keypair: KeyPair<RistrettoPoint>,
  // this is temporary, while the only authorized caller is ashoat's keyserver
  pub keyserver_auth_token: String,
}

impl Config {
  fn load() -> Result<Self, Error> {
    let mut path = env::current_dir()?;
    path.push(SECRETS_DIRECTORY);
    path.push(SECRETS_FILE_NAME);
    path.set_extension(SECRETS_FILE_EXTENSION);
    let keypair = get_keypair_from_file(path)?;
    let auth_token =
      env::var(AUTH_TOKEN).unwrap_or_else(|_| String::from("test"));
    Ok(Self {
      server_keypair: keypair,
      keyserver_auth_token: auth_token,
    })
  }
}

impl fmt::Debug for Config {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    f.debug_struct("Config")
      .field("server_keypair", &"redacted")
      .finish()
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  Pake(PakeError),
  #[display(...)]
  IO(io::Error),
  #[display(...)]
  Env(env::VarError),
}

fn get_keypair_from_file<P: AsRef<Path>>(
  path: P,
) -> Result<KeyPair<RistrettoPoint>, Error> {
  let bytes = fs::read(path)?;
  KeyPair::from_private_key_slice(&bytes)
    .map_err(|e| Error::Pake(PakeError::CryptoError(e)))
}
