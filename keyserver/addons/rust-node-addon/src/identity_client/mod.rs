pub mod register_user;
pub mod identity_client {
  tonic::include_proto!("identity.client");
}

use identity_client::identity_client_service_client::IdentityClientServiceClient;
use identity_client::{
  DeviceKeyUpload, IdentityKeyInfo, RegistrationFinishRequest,
  RegistrationStartRequest,
};
use lazy_static::lazy_static;
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::env::var;
use tonic::{metadata::MetadataValue, transport::Channel, Request};
use tracing::instrument;

lazy_static! {
  static ref IDENTITY_SERVICE_CONFIG: IdentityServiceConfig = {
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
    Self {
      identity_socket_addr: "https://[::1]:50054".to_string(),
      identity_auth_token: "test".to_string(),
    }
  }
}

async fn get_identity_service_channel() -> Result<Channel> {
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
