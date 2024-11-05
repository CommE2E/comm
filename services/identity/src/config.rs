use std::{env, fmt, fs, io, path};

use base64::{engine::general_purpose, DecodeError, Engine as _};
use clap::{Parser, Subcommand};
use http::HeaderValue;
use once_cell::sync::Lazy;
use tower_http::cors::AllowOrigin;
use tracing::{error, info};
use url::Url;

use crate::constants::{
  cors::ALLOW_ORIGIN_LIST, BACKUP_SERVICE_URL, BLOB_SERVICE_URL,
  DEFAULT_BACKUP_SERVICE_URL, DEFAULT_BLOB_SERVICE_URL,
  DEFAULT_OPENSEARCH_ENDPOINT, DEFAULT_TUNNELBROKER_ENDPOINT,
  KEYSERVER_PUBLIC_KEY, LOCALSTACK_ENDPOINT, OPAQUE_SERVER_SETUP,
  OPENSEARCH_ENDPOINT, REDACT_SENSITIVE_DATA, SECRETS_DIRECTORY,
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
  #[arg(value_delimiter = ',')]
  allow_origin_list: Option<Vec<String>>,

  /// Redact sensitive data
  #[arg(long, global = true, default_value_t = false)]
  #[arg(env = REDACT_SENSITIVE_DATA)]
  redact_sensitive_data: bool,

  /// Backup service URL
  #[arg(env = BACKUP_SERVICE_URL)]
  #[arg(long, default_value = DEFAULT_BACKUP_SERVICE_URL)]
  backup_service_url: reqwest::Url,

  /// Blob service URL
  #[arg(env = BLOB_SERVICE_URL)]
  #[arg(long, default_value = DEFAULT_BLOB_SERVICE_URL)]
  blob_service_url: reqwest::Url,
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
  pub backup_service_url: reqwest::Url,
  pub blob_service_url: reqwest::Url,
  pub opensearch_endpoint: String,
  pub allow_origin: Option<AllowOrigin>,
  pub redact_sensitive_data: bool,
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

    let allow_origin = cli
      .allow_origin_list
      .as_ref()
      .map(|s| slice_to_allow_origin(s.as_slice()))
      .transpose()?;

    Ok(Self {
      localstack_endpoint: cli.localstack_endpoint.clone(),
      tunnelbroker_endpoint: cli.tunnelbroker_endpoint.clone(),
      backup_service_url: cli.backup_service_url.clone(),
      blob_service_url: cli.blob_service_url.clone(),
      opensearch_endpoint: cli.opensearch_endpoint.clone(),
      server_setup,
      keyserver_public_key,
      allow_origin,
      redact_sensitive_data: cli.redact_sensitive_data,
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
  InvalidHeaderValue(http::header::InvalidHeaderValue),
  #[display(...)]
  InvalidOrigin(InvalidOriginError),
}

#[derive(Debug, derive_more::Display)]
pub enum InvalidOriginError {
  InvalidScheme,
  MissingHost,
  ParseError,
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

fn slice_to_allow_origin(origins: &[String]) -> Result<AllowOrigin, Error> {
  let allow_origin_result: Result<Vec<HeaderValue>, Error> = origins
    .iter()
    .map(|s| {
      validate_origin(s)?;
      HeaderValue::from_str(s.trim()).map_err(Error::InvalidHeaderValue)
    })
    .collect();
  let allow_origin_list = allow_origin_result?;
  Ok(AllowOrigin::list(allow_origin_list))
}

fn validate_origin(origin_str: &str) -> Result<(), Error> {
  let Ok(url) = Url::parse(origin_str) else {
    return Err(Error::InvalidOrigin(InvalidOriginError::ParseError));
  };
  if !matches!(url.scheme(), "http" | "https") {
    return Err(Error::InvalidOrigin(InvalidOriginError::InvalidScheme));
  };
  if url.host_str().is_none() {
    return Err(Error::InvalidOrigin(InvalidOriginError::MissingHost));
  };
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::validate_origin;

  #[test]
  fn test_valid_origin() {
    let valid_origin = "http://localhost:3000";
    assert!(
      validate_origin(valid_origin).is_ok(),
      "Expected a valid origin, but got an invalid one"
    );
  }

  #[test]
  fn test_invalid_origin_missing_scheme() {
    let invalid_origin = "localhost:3000";
    assert!(
      validate_origin(invalid_origin).is_err(),
      "Expected an invalid origin (missing scheme), but got a valid one"
    );
  }

  #[test]
  fn test_invalid_origin_missing_host() {
    let invalid_origin = "http://:3000";
    assert!(
      validate_origin(invalid_origin).is_err(),
      "Expected an invalid origin (missing host), but got a valid one"
    );
  }

  #[test]
  fn test_valid_origin_missing_port() {
    let valid_origin = "https://web.comm.app";
    assert!(
      validate_origin(valid_origin).is_ok(),
      "Expected origin missing port to be valid"
    );
  }

  #[test]
  fn test_invalid_origin_invalid_scheme() {
    // We only allow http and https origins
    let invalid_origin = "ftp://example.com";
    assert!(
      validate_origin(invalid_origin).is_err(),
      "Expected an invalid origin (invalid scheme), but got a valid one"
    );
  }
}
