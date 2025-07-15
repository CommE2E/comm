use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::auth::{
  UserIdentitiesRequest, UserIdentitiesResponse,
};
use serde::Serialize;
use std::collections::HashMap;

use crate::identity::AuthInfo;
use crate::utils::jsi_callbacks::handle_string_result_as_callback;
use crate::{Error, IDENTITY_SOCKET_ADDR, RUNTIME};

use super::PLATFORM_METADATA;

pub mod ffi {
  use super::*;

  pub fn find_user_identities(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    user_ids: Vec<String>,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result = find_user_identities_helper(auth_info, user_ids).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserIdentities {
  pub identities: HashMap<String, Identity>,
  pub reserved_user_identifiers: HashMap<String, String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EthereumIdentity {
  pub wallet_address: String,
  pub siwe_message: String,
  pub siwe_signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Identity {
  pub username: String,
  pub eth_identity: Option<EthereumIdentity>,
  #[serde(rename = "farcasterID")]
  pub farcaster_id: Option<String>,
  #[serde(rename = "hasFarcasterDCsToken")]
  pub has_farcaster_dcs_token: bool,
}

impl TryFrom<UserIdentitiesResponse> for UserIdentities {
  type Error = Error;

  fn try_from(response: UserIdentitiesResponse) -> Result<Self, Self::Error> {
    let identities: HashMap<String, Identity> = response
      .identities
      .into_iter()
      .map(|(user_id, identity)| {
        let eth_identity =
          identity.eth_identity.map(|eth_identity| EthereumIdentity {
            wallet_address: eth_identity.wallet_address,
            siwe_message: eth_identity.siwe_message,
            siwe_signature: eth_identity.siwe_signature,
          });

        (
          user_id,
          Identity {
            username: identity.username,
            eth_identity,
            farcaster_id: identity.farcaster_id,
            has_farcaster_dcs_token: identity.has_farcaster_dcs_token,
          },
        )
      })
      .collect();

    Ok(UserIdentities {
      identities,
      reserved_user_identifiers: response.reserved_user_identifiers,
    })
  }
}

async fn find_user_identities_helper(
  auth_info: AuthInfo,
  user_ids: Vec<String>,
) -> Result<String, Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  let response = identity_client
    .find_user_identities(UserIdentitiesRequest { user_ids })
    .await?
    .into_inner();

  let user_identities = UserIdentities::try_from(response)?;

  Ok(serde_json::to_string(&user_identities)?)
}
