use base64::{engine::general_purpose, DecodeError, Engine as _};
use clap::{Parser, Subcommand};
use once_cell::sync::Lazy;
use std::{env, fmt, fs, io, path};
use tracing::{error, info};

use crate::constants::{
  cors::ALLOW_ORIGIN_LIST, DEFAULT_OPENSEARCH_ENDPOINT,
  DEFAULT_TUNNELBROKER_ENDPOINT, KEYSERVER_PUBLIC_KEY, LOCALSTACK_ENDPOINT,
  OPAQUE_SERVER_SETUP, OPENSEARCH_ENDPOINT, SECRETS_DIRECTORY,
  SECRETS_SETUP_FILE, TUNNELBROKER_GRPC_ENDPOINT,
};

/// Raw CLI arguments, should be only used internally to create ServerConfig
static CLI: Lazy<Cli> = Lazy::new(Cli::parse);

pub static CONFIG: Lazy<ServerConfig> = Lazy::new(|| {
  ServerConfig::from_cli(&CLI).expect("Failed to load server config")
});

pub(super) fn parse_cli_command() -> &'static Command {
  &Lazy::force(&CLI).command
}

pub(super) fn load_server_config() -> &'static ServerConfig {
  Lazy::force(&CONFIG)
}

#[derive(Parser)]
#[clap(author, version, about, long_about = None)]
#[clap(propagate_version = true)]
struct Cli {
  #[clap(subcommand)]
  command: Command,

  /// AWS Localstack service URL
  #[arg(long, global = true)]
  #[arg(env = LOCALSTACK_ENDPOINT)]
  localstack_endpoint: Option<String>,

  /// Tunnelbroker gRPC endpoint
  #[arg(long, global = true)]
  #[arg(env = TUNNELBROKER_GRPC_ENDPOINT)]
  #[arg(default_value = DEFAULT_TUNNELBROKER_ENDPOINT)]
  tunnelbroker_endpoint: String,

  /// OpenSearch domain endpoint
  #[arg(long, global = true)]
  #[arg(env = OPENSEARCH_ENDPOINT)]
  #[arg(default_value = DEFAULT_OPENSEARCH_ENDPOINT)]
  opensearch_endpoint: String,

  /// Allowed origins
  #[arg(long, global = true)]
  #[arg(env = ALLOW_ORIGIN_LIST)]
  allow_origin_list: Option<String>,
}

#[derive(Subcommand)]
pub enum Command {
  /// Runs the server
  Server,
  /// Generates and persists a keypair to use for PAKE registration and login
  Keygen {
    #[arg(short, long)]
    #[arg(default_value = SECRETS_DIRECTORY)]
    dir: String,
  },
  /// Syncs DynamoDB users with identity-search search index
  SyncIdentitySearch,
}

#[derive(Clone)]
pub struct ServerConfig {
  pub localstack_endpoint: Option<String>,
  // Opaque 2.0 server secrets
  pub server_setup: comm_opaque2::ServerSetup<comm_opaque2::Cipher>,
  pub keyserver_public_key: Option<String>,
  pub tunnelbroker_endpoint: String,
  pub opensearch_endpoint: String,
  pub allow_origin_list: Option<String>,
}

impl ServerConfig {
  fn from_cli(cli: &Cli) -> Result<Self, Error> {
    if !matches!(cli.command, Command::Server | Command::SyncIdentitySearch) {
      panic!("ServerConfig is only available for the `server` or `sync-identity-search` command");
    }

    info!("Tunnelbroker endpoint: {}", &cli.tunnelbroker_endpoint);
    if let Some(endpoint) = &cli.localstack_endpoint {
      info!("Using Localstack endpoint: {}", endpoint);
    }
    info!("Using OpenSearch endpoint: {}", cli.opensearch_endpoint);

    let mut path_buf = path::PathBuf::new();
    path_buf.push(SECRETS_DIRECTORY);
    path_buf.push(SECRETS_SETUP_FILE);

    let server_setup = get_server_setup(path_buf.as_path())?;
    let keyserver_public_key = env::var(KEYSERVER_PUBLIC_KEY).ok();

    Ok(Self {
      localstack_endpoint: cli.localstack_endpoint.clone(),
      tunnelbroker_endpoint: cli.tunnelbroker_endpoint.clone(),
      opensearch_endpoint: cli.opensearch_endpoint.clone(),
      server_setup,
      keyserver_public_key,
      allow_origin_list: cli.allow_origin_list.clone(),
    })
  }
}

impl fmt::Debug for ServerConfig {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    f.debug_struct("ServerConfig")
      .field("localstack_endpoint", &self.localstack_endpoint)
      .field("server_setup", &"** redacted **")
      .field("keyserver_public_key", &self.keyserver_public_key)
      .field("tunnelbroker_endpoint", &self.tunnelbroker_endpoint)
      .field("opensearch_endpoint", &self.opensearch_endpoint)
      .field("allow_origin_list", &"** redacted **")
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
  #[display(...)]
  InvalidRemoteEnvironment,
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
    info!("Using OPAQUE server setup from file: {}", path.display());
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
