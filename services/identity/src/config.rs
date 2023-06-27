use once_cell::sync::Lazy;
use std::{collections::HashSet, env, fmt, fs, io, path};

use crate::constants::{
  KEYSERVER_PUBLIC_KEY, LOCALSTACK_ENDPOINT, SECRETS_DIRECTORY,
  SECRETS_SETUP_FILE,
};

pub static CONFIG: Lazy<Config> =
  Lazy::new(|| Config::load().expect("failed to load config"));

pub(super) fn load_config() {
  Lazy::force(&CONFIG);
}

#[derive(Clone)]
pub struct Config {
  pub localstack_endpoint: Option<String>,
  // Opaque 2.0 server secrets
  pub server_setup: comm_opaque2::ServerSetup<comm_opaque2::Cipher>,
  // Reserved usernames
  pub reserved_usernames: HashSet<String>,
  pub keyserver_public_key: Option<String>,
}

impl Config {
  fn load() -> Result<Self, Error> {
    let localstack_endpoint = env::var(LOCALSTACK_ENDPOINT).ok();

    let mut path = path::PathBuf::new();
    path.push(SECRETS_DIRECTORY);
    path.push(SECRETS_SETUP_FILE);
    let server_setup = get_server_setup_from_file(&path)?;

    let reserved_usernames = get_reserved_usernames_set()?;

    let keyserver_public_key = env::var(KEYSERVER_PUBLIC_KEY).ok();

    Ok(Self {
      localstack_endpoint,
      server_setup,
      reserved_usernames,
      keyserver_public_key,
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
  Opaque(comm_opaque2::ProtocolError),
  #[display(...)]
  Io(io::Error),
  #[display(...)]
  Env(env::VarError),
  #[display(...)]
  Json(serde_json::Error),
}

fn get_server_setup_from_file<P: AsRef<path::Path>>(
  path: &P,
) -> Result<comm_opaque2::ServerSetup<comm_opaque2::Cipher>, Error> {
  let bytes = fs::read(path)?;
  comm_opaque2::ServerSetup::deserialize(&bytes).map_err(Error::Opaque)
}

fn get_reserved_usernames_set() -> Result<HashSet<String>, Error> {
  let contents = include_str!("../reserved_usernames.json");
  let reserved_usernames: Vec<String> = serde_json::from_str(contents)?;

  Ok(reserved_usernames.into_iter().collect())
}
