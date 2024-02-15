use crate::{
  handle_string_result_as_callback, Error, CODE_VERSION, DEVICE_TYPE,
  IDENTITY_SOCKET_ADDR, RUNTIME,
};
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::unauth::{find_user_id_request, FindUserIdRequest},
};
use serde::Serialize;
use tracing::instrument;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FindUserIDResponse {
  #[serde(rename = "userID")]
  user_id: Option<String>,
  is_reserved: bool,
}

#[instrument]
pub fn find_user_id_for_wallet_address(
  wallet_address: String,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let result = find_user_id_helper(wallet_address).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn find_user_id_helper(wallet_address: String) -> Result<String, Error> {
  use find_user_id_request::Identifier as RequestIdentifier;
  let find_user_id_request = FindUserIdRequest {
    identifier: Some(RequestIdentifier::WalletAddress(wallet_address)),
  };

  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let response = identity_client
    .find_user_id(find_user_id_request)
    .await?
    .into_inner();

  let find_user_id_response = FindUserIDResponse {
    user_id: response.user_id,
    is_reserved: response.is_reserved,
  };
  Ok(serde_json::to_string(&find_user_id_response)?)
}
