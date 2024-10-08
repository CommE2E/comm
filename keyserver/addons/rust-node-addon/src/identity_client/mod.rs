pub mod add_reserved_usernames;
pub mod config;
mod find_user_identities;
pub mod get_farcaster_users;
pub mod get_inbound_keys_for_user;
pub mod login;
pub mod nonce;
pub mod prekey;
mod privileged_delete_users;
pub mod register_user;
pub mod remove_reserved_usernames;
pub mod upload_one_time_keys;

use client_proto::identity_client_service_client::IdentityClientServiceClient;
use client_proto::{
  AddReservedUsernamesRequest, DeviceKeyUpload, DeviceType, IdentityKeyInfo,
  Prekey, RegistrationFinishRequest, RegistrationStartRequest,
  RemoveReservedUsernameRequest,
};
use config::get_identity_service_config;
use generated::CODE_VERSION;
use grpc_clients::identity::authenticated::ChainedInterceptedAuthClient;
use grpc_clients::identity::protos::authenticated::{
  InboundKeyInfo, PrivilegedDeleteUsersRequest, UploadOneTimeKeysRequest,
};
use grpc_clients::identity::protos::unauthenticated as client_proto;
use grpc_clients::identity::shared::CodeVersionLayer;
use grpc_clients::identity::PlatformMetadata;
use lazy_static::lazy_static;
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::env::var;
use tonic::codegen::InterceptedService;
use tonic::transport::Channel;
use tracing::{self, info, instrument, warn, Level};
use tracing_subscriber::EnvFilter;

mod generated {
  // We get the CODE_VERSION from this generated file
  include!(concat!(env!("OUT_DIR"), "/version.rs"));
}

const DEVICE_TYPE: &str = "keyserver";
const ENV_NODE_ENV: &str = "NODE_ENV";
const ENV_DEVELOPMENT: &str = "development";

lazy_static! {
  static ref IDENTITY_SERVICE_CONFIG: IdentityServiceConfig = {
    let filter = EnvFilter::builder()
      .with_default_directive(Level::INFO.into())
      .with_env_var(EnvFilter::DEFAULT_ENV)
      .from_env_lossy();

    let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber)
      .expect("Unable to configure tracing");

    get_identity_service_config()
      .unwrap_or_else(|_| IdentityServiceConfig::default())
  };
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityServiceConfig {
  identity_socket_addr: String,
}

impl Default for IdentityServiceConfig {
  fn default() -> Self {
    info!("Using default identity configuration based on NODE_ENV");

    const DEV_SOCKET_ADDR: &str =
      "https://identity.staging.commtechnologies.org:50054";
    const PROD_SOCKET_ADDR: &str =
      "https://identity.commtechnologies.org:50054";

    let default_socket_addr = match var(ENV_NODE_ENV) {
      Ok(val) if val == ENV_DEVELOPMENT => DEV_SOCKET_ADDR,
      _ => PROD_SOCKET_ADDR,
    }
    .to_string();

    Self {
      identity_socket_addr: default_socket_addr,
    }
  }
}

async fn get_identity_client() -> Result<
  IdentityClientServiceClient<InterceptedService<Channel, CodeVersionLayer>>,
> {
  info!("Connecting to identity service");

  grpc_clients::identity::get_unauthenticated_client(
    &IDENTITY_SERVICE_CONFIG.identity_socket_addr,
    PlatformMetadata::new(CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .map_err(|e| {
    Error::new(
      Status::GenericFailure,
      format!("Unable to connect to identity service: {}", e),
    )
  })
}

async fn get_authenticated_identity_client(
  user_id: String,
  device_id: String,
  access_token: String,
) -> Result<ChainedInterceptedAuthClient> {
  info!("Connecting to identity service");

  grpc_clients::identity::get_auth_client(
    &IDENTITY_SERVICE_CONFIG.identity_socket_addr,
    user_id,
    device_id,
    access_token,
    PlatformMetadata::new(CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .map_err(|e| {
    Error::new(
      Status::GenericFailure,
      format!("Unable to connect to identity service: {}", e),
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

pub struct DeviceInboundKeyInfo {
  pub payload: String,
  pub payload_signature: String,
  pub content_prekey: String,
  pub content_prekey_signature: String,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
}

impl TryFrom<InboundKeyInfo> for DeviceInboundKeyInfo {
  type Error = Error;

  fn try_from(key_info: InboundKeyInfo) -> Result<Self> {
    let identity_info = key_info
      .identity_info
      .ok_or(Error::from_status(Status::GenericFailure))?;

    let IdentityKeyInfo {
      payload,
      payload_signature,
    } = identity_info;

    let content_prekey = key_info
      .content_prekey
      .ok_or(Error::from_status(Status::GenericFailure))?;

    let Prekey {
      prekey: content_prekey_value,
      prekey_signature: content_prekey_signature,
    } = content_prekey;

    let notif_prekey = key_info
      .notif_prekey
      .ok_or(Error::from_status(Status::GenericFailure))?;

    let Prekey {
      prekey: notif_prekey_value,
      prekey_signature: notif_prekey_signature,
    } = notif_prekey;

    Ok(Self {
      payload,
      payload_signature,
      content_prekey: content_prekey_value,
      content_prekey_signature,
      notif_prekey: notif_prekey_value,
      notif_prekey_signature,
    })
  }
}

#[napi(object)]
pub struct InboundKeyInfoResponse {
  pub payload: String,
  pub payload_signature: String,
  pub content_prekey: String,
  pub content_prekey_signature: String,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
  pub username: Option<String>,
  pub wallet_address: Option<String>,
}

pub fn handle_grpc_error(error: tonic::Status) -> napi::Error {
  warn!("Received error: {}", error.message());
  Error::new(Status::GenericFailure, error.message())
}

#[cfg(test)]
mod tests {
  use super::CODE_VERSION;

  #[test]
  #[allow(clippy::assertions_on_constants)]
  fn test_code_version_exists() {
    assert!(CODE_VERSION > 0);
  }
}
