use base64::{engine::general_purpose, DecodeError, Engine as _};
use once_cell::sync::Lazy;
use std::{collections::HashSet, env, fmt, fs, io, path};
use tracing::{error, info};

use crate::constants::{
  KEYSERVER_PUBLIC_KEY, LOCALSTACK_ENDPOINT, OPAQUE_SERVER_SETUP,
  SECRETS_DIRECTORY, SECRETS_SETUP_FILE,
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

    let mut path_buf = path::PathBuf::new();
    path_buf.push(SECRETS_DIRECTORY);
    path_buf.push(SECRETS_SETUP_FILE);

    let server_setup = get_server_setup(path_buf.as_path())?;

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
  #[display(...)]
  Decode(DecodeError),
}

fn get_server_setup(
  path: &path::Path,
) -> Result<comm_opaque2::ServerSetup<comm_opaque2::Cipher>, Error> {
  let encoded_server_setup = if let Ok(env_setup) =
    env::var(OPAQUE_SERVER_SETUP)
  {
    info!(
      "Using OPAQUE server setup from env var: {}",
      OPAQUE_SERVER_SETUP
    );
    env_setup
  } else if let Ok(file_setup) = fs::read_to_string(path) {
    info!("Using OPAQUE server setup from file: {:?}", path.display());
    file_setup
  } else {
    error!("Unable to locate OPAQUE server setup. Please run `keygen` command and run Identity service again.");
    return Err(Error::Io(io::Error::new(
      io::ErrorKind::NotFound,
      "Missing server credentials",
    )));
  };

  let decoded_server_setup =
    general_purpose::STANDARD_NO_PAD.decode(encoded_server_setup)?;
  comm_opaque2::ServerSetup::deserialize(&decoded_server_setup)
    .map_err(Error::Opaque)
}

fn get_reserved_usernames_set() -> Result<HashSet<String>, Error> {
  // All entries in `reserved_usernames.json` must be lowercase and must also be
  // included in `lib/utils/reserved-users.js`!!
  let contents = include_str!("../reserved_usernames.json");
  let reserved_usernames: Vec<String> = serde_json::from_str(contents)?;

  Ok(reserved_usernames.into_iter().collect())
}
