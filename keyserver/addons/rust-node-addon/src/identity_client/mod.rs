pub mod add_reserved_usernames;
pub mod login;
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

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityServiceConfig {
  identity_socket_addr: String,
  identity_auth_token: String,
}

impl Default for IdentityServiceConfig {
  fn default() -> Self {
    info!("Using default identity configuration");
    Self {
      identity_socket_addr: "https://[::1]:50054".to_string(),
      identity_auth_token: "test".to_string(),
    }
  }
}

async fn get_identity_service_channel() -> Result<Channel> {
  info!("Connecting to identity service");
  Channel::from_static(&IDENTITY_SERVICE_CONFIG.identity_socket_addr)
    .connect()
    .await
    .map_err(|_| {
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
