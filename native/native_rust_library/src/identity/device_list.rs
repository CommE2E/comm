use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::auth::{
  GetDeviceListRequest, PeersDeviceListsRequest, UpdateDeviceListRequest,
};

use crate::identity::AuthInfo;
use crate::utils::jsi_callbacks::{
  handle_string_result_as_callback, handle_void_result_as_callback,
};
use crate::{Error, CODE_VERSION, DEVICE_TYPE, IDENTITY_SOCKET_ADDR, RUNTIME};

pub mod ffi {
  use super::*;

  pub fn get_device_list_for_user(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    user_id: String,
    since_timestamp: i64,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let since_timestamp = Option::from(since_timestamp).filter(|&t| t > 0);
      let result =
        get_device_list_for_user_helper(auth_info, user_id, since_timestamp)
          .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn get_device_lists_for_users(
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
      let result = get_device_lists_for_users_helper(auth_info, user_ids).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn update_device_list(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    update_payload: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result = update_device_list_helper(auth_info, update_payload).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }
}

async fn get_device_list_for_user_helper(
  auth_info: AuthInfo,
  user_id: String,
  since_timestamp: Option<i64>,
) -> Result<String, Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let response = identity_client
    .get_device_list_for_user(GetDeviceListRequest {
      user_id,
      since_timestamp,
    })
    .await?
    .into_inner();

  let payload = serde_json::to_string(&response.device_list_updates)?;
  Ok(payload)
}

async fn get_device_lists_for_users_helper(
  auth_info: AuthInfo,
  user_ids: Vec<String>,
) -> Result<String, Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let response = identity_client
    .get_device_lists_for_users(PeersDeviceListsRequest { user_ids })
    .await?
    .into_inner();

  let payload = serde_json::to_string(&response.users_device_lists)?;
  Ok(payload)
}

async fn update_device_list_helper(
  auth_info: AuthInfo,
  update_payload: String,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let update_request = UpdateDeviceListRequest {
    new_device_list: update_payload,
  };

  identity_client.update_device_list(update_request).await?;

  Ok(())
}
