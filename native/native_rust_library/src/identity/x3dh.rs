use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::authenticated::{
  InboundKeyInfo, InboundKeysForUserRequest, KeyserverKeysResponse,
  OutboundKeyInfo, OutboundKeysForUserRequest, RefreshUserPrekeysRequest,
  UploadOneTimeKeysRequest,
};
use grpc_clients::identity::protos::unauth::{IdentityKeyInfo, Prekey};
use serde::Serialize;
use tracing::instrument;

use crate::identity::AuthInfo;
use crate::utils::jsi_callbacks::{
  handle_string_result_as_callback, handle_void_result_as_callback,
};
use crate::{Error, IDENTITY_SOCKET_ADDR, RUNTIME};

use super::PLATFORM_METADATA;

pub mod ffi {
  use super::*;

  pub fn get_outbound_keys_for_user(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    user_id: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let get_outbound_keys_request_info =
        GetOutboundKeysRequestInfo { user_id };
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result = get_outbound_keys_for_user_helper(
        get_outbound_keys_request_info,
        auth_info,
      )
      .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn get_inbound_keys_for_user(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    user_id: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let get_inbound_keys_request_info = GetInboundKeysRequestInfo { user_id };
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result = get_inbound_keys_for_user_helper(
        get_inbound_keys_request_info,
        auth_info,
      )
      .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn get_keyserver_keys(
    user_id: String,
    device_id: String,
    access_token: String,
    keyserver_id: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let get_keyserver_keys_request = OutboundKeysForUserRequest {
        user_id: keyserver_id,
        selected_devices: Vec::new(),
      };
      let auth_info = AuthInfo {
        access_token,
        user_id,
        device_id,
      };
      let result =
        get_keyserver_keys_helper(get_keyserver_keys_request, auth_info).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  #[allow(clippy::too_many_arguments)]
  pub fn refresh_user_prekeys(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let refresh_request = RefreshUserPrekeysRequest {
        new_content_prekey: Some(Prekey {
          prekey: content_prekey,
          prekey_signature: content_prekey_signature,
        }),
        new_notif_prekey: Some(Prekey {
          prekey: notif_prekey,
          prekey_signature: notif_prekey_signature,
        }),
      };

      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result =
        refresh_user_prekeys_helper(refresh_request, auth_info).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  #[instrument]
  pub fn upload_one_time_keys(
    auth_user_id: String,
    auth_device_id: String,
    auth_access_token: String,
    content_one_time_keys: Vec<String>,
    notif_one_time_keys: Vec<String>,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let upload_request = UploadOneTimeKeysRequest {
        content_one_time_prekeys: content_one_time_keys,
        notif_one_time_prekeys: notif_one_time_keys,
      };
      let auth_info = AuthInfo {
        access_token: auth_access_token,
        user_id: auth_user_id,
        device_id: auth_device_id,
      };
      let result = upload_one_time_keys_helper(auth_info, upload_request).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }
}

// helper structs

struct GetOutboundKeysRequestInfo {
  user_id: String,
}

struct GetInboundKeysRequestInfo {
  user_id: String,
}

// This struct should not be altered without also updating
// OutboundKeyInfoResponse in lib/types/identity-service-types.js
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OutboundKeyInfoResponse {
  pub payload: String,
  pub payload_signature: String,
  pub content_prekey: String,
  pub content_prekey_signature: String,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
  pub one_time_content_prekey: Option<String>,
  pub one_time_notif_prekey: Option<String>,
}

// This struct should not be altered without also updating
// InboundKeyInfoResponse in lib/types/identity-service-types.js
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InboundKeyInfoResponse {
  pub payload: String,
  pub payload_signature: String,
  pub content_prekey: String,
  pub content_prekey_signature: String,
  pub notif_prekey: String,
  pub notif_prekey_signature: String,
}

impl TryFrom<OutboundKeyInfo> for OutboundKeyInfoResponse {
  type Error = Error;

  fn try_from(key_info: OutboundKeyInfo) -> Result<Self, Error> {
    let identity_info =
      key_info.identity_info.ok_or(Error::MissingResponseData)?;

    let IdentityKeyInfo {
      payload,
      payload_signature,
    } = identity_info;

    let content_prekey =
      key_info.content_prekey.ok_or(Error::MissingResponseData)?;

    let Prekey {
      prekey: content_prekey_value,
      prekey_signature: content_prekey_signature,
    } = content_prekey;

    let notif_prekey =
      key_info.notif_prekey.ok_or(Error::MissingResponseData)?;

    let Prekey {
      prekey: notif_prekey_value,
      prekey_signature: notif_prekey_signature,
    } = notif_prekey;

    let one_time_content_prekey = key_info.one_time_content_prekey;
    let one_time_notif_prekey = key_info.one_time_notif_prekey;

    Ok(Self {
      payload,
      payload_signature,
      content_prekey: content_prekey_value,
      content_prekey_signature,
      notif_prekey: notif_prekey_value,
      notif_prekey_signature,
      one_time_content_prekey,
      one_time_notif_prekey,
    })
  }
}

impl TryFrom<KeyserverKeysResponse> for OutboundKeyInfoResponse {
  type Error = Error;

  fn try_from(response: KeyserverKeysResponse) -> Result<Self, Error> {
    let key_info = response.keyserver_info.ok_or(Error::MissingResponseData)?;
    Self::try_from(key_info)
  }
}

impl TryFrom<InboundKeyInfo> for InboundKeyInfoResponse {
  type Error = Error;

  fn try_from(key_info: InboundKeyInfo) -> Result<Self, Error> {
    let identity_info =
      key_info.identity_info.ok_or(Error::MissingResponseData)?;

    let IdentityKeyInfo {
      payload,
      payload_signature,
    } = identity_info;

    let content_prekey =
      key_info.content_prekey.ok_or(Error::MissingResponseData)?;

    let Prekey {
      prekey: content_prekey_value,
      prekey_signature: content_prekey_signature,
    } = content_prekey;

    let notif_prekey =
      key_info.notif_prekey.ok_or(Error::MissingResponseData)?;

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

async fn get_outbound_keys_for_user_helper(
  get_outbound_keys_request_info: GetOutboundKeysRequestInfo,
  auth_info: AuthInfo,
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
    .get_outbound_keys_for_user(OutboundKeysForUserRequest {
      user_id: get_outbound_keys_request_info.user_id,
      selected_devices: Vec::new(),
    })
    .await?
    .into_inner();

  let outbound_key_info: Vec<OutboundKeyInfoResponse> = response
    .devices
    .into_values()
    .map(OutboundKeyInfoResponse::try_from)
    .collect::<Result<Vec<_>, _>>()?;

  Ok(serde_json::to_string(&outbound_key_info)?)
}

async fn get_inbound_keys_for_user_helper(
  get_inbound_keys_request_info: GetInboundKeysRequestInfo,
  auth_info: AuthInfo,
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
    .get_inbound_keys_for_user(InboundKeysForUserRequest {
      user_id: get_inbound_keys_request_info.user_id,
      selected_devices: Vec::new(),
    })
    .await?
    .into_inner();

  let inbound_key_info: Vec<InboundKeyInfoResponse> = response
    .devices
    .into_values()
    .map(InboundKeyInfoResponse::try_from)
    .collect::<Result<Vec<_>, _>>()?;

  Ok(serde_json::to_string(&inbound_key_info)?)
}

async fn get_keyserver_keys_helper(
  get_keyserver_keys_request: OutboundKeysForUserRequest,
  auth_info: AuthInfo,
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
    .get_keyserver_keys(get_keyserver_keys_request)
    .await?
    .into_inner();

  let keyserver_keys = OutboundKeyInfoResponse::try_from(response)?;

  Ok(serde_json::to_string(&keyserver_keys)?)
}

async fn refresh_user_prekeys_helper(
  refresh_request: RefreshUserPrekeysRequest,
  auth_info: AuthInfo,
) -> Result<(), Error> {
  get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?
  .refresh_user_prekeys(refresh_request)
  .await?;

  Ok(())
}

async fn upload_one_time_keys_helper(
  auth_info: AuthInfo,
  upload_request: UploadOneTimeKeysRequest,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  identity_client.upload_one_time_keys(upload_request).await?;

  Ok(())
}
