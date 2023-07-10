pub mod add_reserved_usernames;
pub mod auth_client;
pub mod login;
pub mod prekey;
pub mod register_user;
pub mod remove_reserved_usernames;
pub mod identity_client {
  tonic::include_proto!("identity.client");
}

use identity_client::identity_client_service_client::IdentityClientServiceClient;
use identity_client::{
  AddReservedUsernamesRequest, DeviceKeyUpload, IdentityKeyInfo, PreKey,
  RegistrationFinishRequest, RegistrationStartRequest,
  RemoveReservedUsernameRequest,
};
use lazy_static::lazy_static;
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::env::var;
use std::path::Path;
use tonic::transport::{Certificate, ClientTlsConfig};
use tonic::{transport::Channel, Request};
use tracing::{self, info, instrument, warn, Level};
use tracing_subscriber::EnvFilter;

lazy_static! {
  static ref IDENTITY_SERVICE_CONFIG: IdentityServiceConfig = {
    let filter = EnvFilter::builder()
      .with_default_directive(Level::INFO.into())
      .with_env_var(EnvFilter::DEFAULT_ENV)
      .from_env_lossy();

    let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber)
      .expect("Unable to configure tracing");

    let config_json_string =
      var("COMM_JSONCONFIG_secrets_identity_service_config");
    match config_json_string {
      Ok(json) => serde_json::from_str(&json).unwrap(),
      Err(_) => IdentityServiceConfig::default(),
    }
  };
}

const CERT_PATHS: &'static [&'static str] = &[
  // MacOS and newer Ubuntu
  "/etc/ssl/cert.pem",
  // Common CA cert paths
  "/etc/ssl/certs/ca-bundle.crt",
  "/etc/ssl/certs/ca-certificates.crt",
];

pub fn get_ca_cert_contents() -> Option<String> {
  CERT_PATHS
    .iter()
    .map(Path::new)
    .filter(|p| p.exists())
    .filter_map(|f| std::fs::read_to_string(f).ok())
    .next()
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityServiceConfig {
  identity_socket_addr: String,
}

impl Default for IdentityServiceConfig {
  fn default() -> Self {
    info!("Using default identity configuration");
    Self {
      identity_socket_addr: "http://[::1]:50054".to_string(),
    }
  }
}

async fn get_identity_service_channel() -> Result<Channel> {
  let ca_cert = get_ca_cert_contents().expect("Unable to get CA bundle");

  info!("Connecting to identity service");

  let mut channel =
    Channel::from_static(&IDENTITY_SERVICE_CONFIG.identity_socket_addr);

  // tls_config will fail if the underlying URI is only http://
  if IDENTITY_SERVICE_CONFIG
    .identity_socket_addr
    .starts_with("https:")
  {
    channel = channel
      .tls_config(
        ClientTlsConfig::new().ca_certificate(Certificate::from_pem(&ca_cert)),
      )
      .map_err(|_| {
        Error::new(Status::GenericFailure, "TLS configure failed")
      })?;
  }

  channel.connect().await.map_err(|_| {
    Error::new(
      Status::GenericFailure,
      "Unable to connect to identity service".to_string(),
    )
  })
}

#[napi(object)]
pub struct SignedIdentityKeysBlob {
  pub payload: String,
  pub signature: String,
}

#[napi(object)]
pub struct UserLoginInfo {
  pub user_id: String,
  pub access_token: String,
}

pub fn handle_grpc_error(error: tonic::Status) -> napi::Error {
  warn!("Received error: {}", error.message());
  Error::new(Status::GenericFailure, error.message())
}
