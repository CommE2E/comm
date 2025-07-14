use crate::{
  utils::jsi_callbacks::{
    handle_string_result_as_callback, handle_void_result_as_callback,
  },
  Error, IDENTITY_SOCKET_ADDR, RUNTIME,
};
use grpc_clients::identity::{
  get_auth_client, get_unauthenticated_client,
  protos::auth::LinkFarcasterAccountRequest, protos::unauth::Empty,
  protos::unauth::GetFarcasterUsersRequest,
};
use serde::Serialize;

use super::PLATFORM_METADATA;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FarcasterUser {
  #[serde(rename = "userID")]
  user_id: String,
  username: String,
  #[serde(rename = "farcasterID")]
  farcaster_id: String,
}

pub mod ffi {
  use super::*;

  pub fn get_farcaster_users(farcaster_ids: Vec<String>, promise_id: u32) {
    RUNTIME.spawn(async move {
      let result = get_farcaster_users_helper(farcaster_ids).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn link_farcaster_account(
    user_id: String,
    device_id: String,
    access_token: String,
    farcaster_id: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result = link_farcaster_account_helper(
        user_id,
        device_id,
        access_token,
        farcaster_id,
      )
      .await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  pub fn unlink_farcaster_account(
    user_id: String,
    device_id: String,
    access_token: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result =
        unlink_farcaster_account_helper(user_id, device_id, access_token).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }
}

pub fn possibly_empty_string_to_option(input: &str) -> Option<String> {
  if input.is_empty() {
    None
  } else {
    Some(input.to_string())
  }
}

async fn get_farcaster_users_helper(
  farcaster_ids: Vec<String>,
) -> Result<String, Error> {
  let get_farcaster_users_request = GetFarcasterUsersRequest { farcaster_ids };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let response = identity_client
    .get_farcaster_users(get_farcaster_users_request)
    .await?
    .into_inner();

  let mapped_response: Vec<FarcasterUser> = response
    .farcaster_users
    .into_iter()
    .map(|farcaster_user| FarcasterUser {
      user_id: farcaster_user.user_id,
      username: farcaster_user.username,
      farcaster_id: farcaster_user.farcaster_id,
    })
    .collect();

  Ok(serde_json::to_string(&mapped_response)?)
}

async fn link_farcaster_account_helper(
  user_id: String,
  device_id: String,
  access_token: String,
  farcaster_id: String,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    user_id,
    device_id,
    access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  let link_farcaster_account_request =
    LinkFarcasterAccountRequest { farcaster_id };

  identity_client
    .link_farcaster_account(link_farcaster_account_request)
    .await?;

  Ok(())
}

async fn unlink_farcaster_account_helper(
  user_id: String,
  device_id: String,
  access_token: String,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    user_id,
    device_id,
    access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  identity_client.unlink_farcaster_account(Empty {}).await?;

  Ok(())
}
