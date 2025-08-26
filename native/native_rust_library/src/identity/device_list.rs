use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::auth::{
  GetDeviceListRequest, PeersDeviceListsRequest, PeersDeviceListsResponse,
  UpdateDeviceListRequest,
};
use grpc_clients::identity::protos::unauth::Empty;
use std::collections::HashMap;

use super::PLATFORM_METADATA;
use crate::identity::AuthInfo;
use crate::utils::jsi_callbacks::{
  handle_string_result_as_callback, handle_void_result_as_callback,
};
use crate::{Error, IDENTITY_SOCKET_ADDR, RUNTIME};
use serde::Serialize;

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

  pub fn sync_platform_details(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result = sync_platform_details_helper(auth_info).await;
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
    PLATFORM_METADATA.clone(),
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
    PLATFORM_METADATA.clone(),
  )
  .await?;

  let PeersDeviceListsResponse {
    users_device_lists,
    users_devices_platform_details,
  } = identity_client
    .get_device_lists_for_users(PeersDeviceListsRequest { user_ids })
    .await?
    .into_inner();

  let nested_users_devices_platform_details: HashMap<
    String,
    HashMap<String, PlatformDetails>,
  > = users_devices_platform_details
    .into_iter()
    .map(|(user_id, user_devices_platform_details)| {
      (
        user_id,
        user_devices_platform_details
          .devices_platform_details
          .into_iter()
          .map(|(device_id, platform_details)| {
            (device_id, platform_details.into())
          })
          .collect(),
      )
    })
    .collect();

  let result = PeersDeviceLists {
    users_device_lists,
    users_devices_platform_details: nested_users_devices_platform_details,
  };

  let payload = serde_json::to_string(&result)?;
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
    PLATFORM_METADATA.clone(),
  )
  .await?;

  let update_request = UpdateDeviceListRequest {
    new_device_list: update_payload,
  };

  identity_client.update_device_list(update_request).await?;

  Ok(())
}

async fn sync_platform_details_helper(
  auth_info: AuthInfo,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  identity_client.sync_platform_details(Empty {}).await?;

  Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlatformDetails {
  device_type: i32,
  code_version: u64,
  state_version: Option<u64>,
  major_desktop_version: Option<u64>,
}

impl From<grpc_clients::identity::protos::auth::PlatformDetails>
  for PlatformDetails
{
  fn from(
    value: grpc_clients::identity::protos::auth::PlatformDetails,
  ) -> Self {
    Self {
      device_type: value.device_type,
      code_version: value.code_version,
      state_version: value.state_version,
      major_desktop_version: value.major_desktop_version,
    }
  }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PeersDeviceLists {
  users_device_lists: HashMap<String, String>,
  users_devices_platform_details:
    HashMap<String, HashMap<String, PlatformDetails>>,
}
