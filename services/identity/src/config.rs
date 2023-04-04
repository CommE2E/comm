use curve25519_dalek::ristretto::RistrettoPoint;
use once_cell::sync::Lazy;
use opaque_ke::{errors::PakeError, keypair::KeyPair};
use std::{env, fmt, fs, io, path, path::Path};

use crate::constants::{
  AUTH_TOKEN, LOCALSTACK_ENDPOINT, SECRETS_DIRECTORY, SECRETS_FILE_EXTENSION,
  SECRETS_FILE_NAME, SECRETS_SETUP_FILE,
};

pub static CONFIG: Lazy<Config> =
  Lazy::new(|| Config::load().expect("failed to load config"));

pub(super) fn load_config() {
  Lazy::force(&CONFIG);
}

#[derive(Clone)]
pub struct Config {
  // Opaque 1.2 server secrets
  pub server_keypair: KeyPair<RistrettoPoint>,
  // this is temporary, while the only authorized caller is ashoat's keyserver
  pub keyserver_auth_token: String,
  pub localstack_endpoint: Option<String>,
  // Opaque 2.0 server secrets
  pub server_setup: comm_opaque2::ServerSetup<comm_opaque2::Cipher>,
}

impl Config {
  fn load() -> Result<Self, Error> {
    let mut path = env::current_dir()?;
    path.push(SECRETS_DIRECTORY);
    path.push(SECRETS_FILE_NAME);
    path.set_extension(SECRETS_FILE_EXTENSION);
    let server_keypair = get_keypair_from_file(path)?;
    let keyserver_auth_token =
      env::var(AUTH_TOKEN).unwrap_or_else(|_| String::from("test"));
    let localstack_endpoint = env::var(LOCALSTACK_ENDPOINT).ok();

    let mut path = path::PathBuf::new();
    path.push(SECRETS_DIRECTORY);
    path.push(SECRETS_SETUP_FILE);
    let server_setup = get_server_setup_from_file(&path)?;

    Ok(Self {
      server_keypair,
      keyserver_auth_token,
      localstack_endpoint,
      server_setup,
    })
  }
}

impl fmt::Debug for Config {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    f.debug_struct("Config")
      .field("server_keypair", &"** redacted **")
      .field("keyserver_auth_token", &"** redacted **")
      .field("localstack_endpoint", &self.localstack_endpoint)
      .finish()
  }
}

#[derive(Debug, derive_more::Display, derive_more::From)]
pub enum Error {
  #[display(...)]
  Pake(PakeError),
  #[display(...)]
  Opaque(comm_opaque2::ProtocolError),
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

fn get_server_setup_from_file<P: AsRef<Path>>(
  path: &P,
) -> Result<comm_opaque2::ServerSetup<comm_opaque2::Cipher>, Error> {
  let bytes = fs::read(path)?;
  comm_opaque2::ServerSetup::deserialize(&bytes).map_err(|e| Error::Opaque(e))
}
