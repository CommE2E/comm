use std::collections::HashMap;

use super::*;

use grpc_clients::identity::protos::auth::{
  EthereumIdentity as ProtoEthereumIdentity, Identity as ProtoIdentity,
  UserIdentitiesRequest, UserIdentitiesResponse as ProtoResponse,
};
use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn find_user_identities(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  user_ids: Vec<String>,
) -> Result<UserIdentitiesResponse> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client = get_authenticated_identity_client(
    auth_user_id,
    auth_device_id,
    auth_access_token,
  )
  .await?;

  let user_identities_request = UserIdentitiesRequest { user_ids };

  debug!("Sending one time keys to Identity service");
  let response = identity_client
    .find_user_identities(user_identities_request)
    .await
    .map_err(handle_grpc_error)?;

  let user_identities_response =
    UserIdentitiesResponse::from(response.into_inner());

  Ok(user_identities_response)
}

// This struct should not be altered without also updating
// UserIdentitiesResponse in lib/types/identity-service-types.js
#[napi(object)]
pub struct UserIdentitiesResponse {
  pub identities: HashMap<String, Identity>,
  pub reserved_user_identifiers: HashMap<String, String>,
}

// This struct should not be altered without also updating Identity in
// lib/types/identity-service-types.js
#[napi(object)]
pub struct Identity {
  pub username: String,
  pub eth_identity: Option<EthereumIdentity>,
  #[napi(js_name = "farcasterID")]
  pub farcaster_id: Option<String>,
  #[napi(js_name = "hasFarcasterDCsToken")]
  pub has_farcaster_dcs_token: bool,
}

// This struct should not be altered without also updating EthereumIdentity in
// lib/types/identity-service-types.js
#[napi(object)]
pub struct EthereumIdentity {
  pub wallet_address: String,
  pub siwe_message: String,
  pub siwe_signature: String,
}

impl From<ProtoResponse> for UserIdentitiesResponse {
  fn from(response: ProtoResponse) -> UserIdentitiesResponse {
    UserIdentitiesResponse {
      identities: response
        .identities
        .into_iter()
        .map(|(key, proto_identity)| (key, Identity::from(proto_identity)))
        .collect(),
      reserved_user_identifiers: response.reserved_user_identifiers,
    }
  }
}

impl From<ProtoIdentity> for Identity {
  fn from(proto_identity: ProtoIdentity) -> Self {
    Identity {
      username: proto_identity.username,
      eth_identity: proto_identity.eth_identity.map(EthereumIdentity::from),
      farcaster_id: proto_identity.farcaster_id,
      has_farcaster_dcs_token: proto_identity.has_farcaster_dcs_token,
    }
  }
}

impl From<ProtoEthereumIdentity> for EthereumIdentity {
  fn from(proto_ethereum_identity: ProtoEthereumIdentity) -> Self {
    EthereumIdentity {
      wallet_address: proto_ethereum_identity.wallet_address,
      siwe_message: proto_ethereum_identity.siwe_message,
      siwe_signature: proto_ethereum_identity.siwe_signature,
    }
  }
}
