use comm_opaque2::client::Login;
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::unauth::{
    DeviceKeyUpload, ExistingDeviceLoginRequest, IdentityKeyInfo,
    OpaqueLoginFinishRequest, OpaqueLoginStartRequest, Prekey,
    RestoreUserRequest, SecondaryDeviceKeysUploadRequest, WalletAuthRequest,
  },
};
use tracing::instrument;

use super::{
  IdentityAuthResult, LogInPasswordUserInfo, LogInWalletUserInfo,
  RestoreUserInfo, PLATFORM_METADATA,
};
use crate::utils::jsi_callbacks::handle_string_result_as_callback;
use crate::{Error, DEVICE_TYPE, IDENTITY_SOCKET_ADDR, RUNTIME};

#[allow(clippy::too_many_arguments)]
pub mod ffi {
  use crate::identity::{
    DeviceKeys, LogInPasswordUserInfo, LogInWalletUserInfo,
  };

  use super::*;

  #[instrument]
  pub fn log_in_password_user(
    username: String,
    password: String,
    key_payload: String,
    key_payload_signature: String,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
    content_one_time_keys: Vec<String>,
    notif_one_time_keys: Vec<String>,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let password_user_info = LogInPasswordUserInfo {
        username,
        password,
        device_keys: DeviceKeys {
          key_payload,
          key_payload_signature,
          content_prekey,
          content_prekey_signature,
          notif_prekey,
          notif_prekey_signature,
          content_one_time_keys,
          notif_one_time_keys,
        },
      };
      let result = log_in_password_user_helper(password_user_info).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  #[instrument]
  pub fn log_in_wallet_user(
    siwe_message: String,
    siwe_signature: String,
    key_payload: String,
    key_payload_signature: String,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
    content_one_time_keys: Vec<String>,
    notif_one_time_keys: Vec<String>,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let wallet_user_info = LogInWalletUserInfo {
        siwe_message,
        siwe_signature,
        device_keys: DeviceKeys {
          key_payload,
          key_payload_signature,
          content_prekey,
          content_prekey_signature,
          notif_prekey,
          notif_prekey_signature,
          content_one_time_keys,
          notif_one_time_keys,
        },
      };
      let result = log_in_wallet_user_helper(wallet_user_info).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  // Primary device restore
  #[instrument]
  pub fn restore_user(
    user_id: String,
    siwe_message: String,
    siwe_signature: String,
    key_payload: String,
    key_payload_signature: String,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
    content_one_time_keys: Vec<String>,
    notif_one_time_keys: Vec<String>,
    device_list: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let siwe_message = Some(siwe_message).filter(|it| !it.is_empty());
      let siwe_signature = Some(siwe_signature).filter(|it| !it.is_empty());
      let restored_user_info = RestoreUserInfo {
        user_id,
        siwe_message,
        siwe_signature,
        device_list,
        device_keys: DeviceKeys {
          key_payload,
          key_payload_signature,
          content_prekey,
          content_prekey_signature,
          notif_prekey,
          notif_prekey_signature,
          content_one_time_keys,
          notif_one_time_keys,
        },
      };
      let result = restore_user_helper(restored_user_info).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  // QR code device log in
  pub fn upload_secondary_device_keys_and_log_in(
    user_id: String,
    nonce: String,
    nonce_signature: String,
    key_payload: String,
    key_payload_signature: String,
    content_prekey: String,
    content_prekey_signature: String,
    notif_prekey: String,
    notif_prekey_signature: String,
    content_one_time_keys: Vec<String>,
    notif_one_time_keys: Vec<String>,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let device_key_upload = DeviceKeyUpload {
        device_key_info: Some(IdentityKeyInfo {
          payload: key_payload,
          payload_signature: key_payload_signature,
        }),
        content_upload: Some(Prekey {
          prekey: content_prekey,
          prekey_signature: content_prekey_signature,
        }),
        notif_upload: Some(Prekey {
          prekey: notif_prekey,
          prekey_signature: notif_prekey_signature,
        }),
        one_time_content_prekeys: content_one_time_keys,
        one_time_notif_prekeys: notif_one_time_keys,
        device_type: DEVICE_TYPE.into(),
      };

      let result = upload_secondary_device_keys_and_log_in_helper(
        user_id,
        nonce,
        nonce_signature,
        device_key_upload,
      )
      .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  pub fn log_in_existing_device(
    user_id: String,
    device_id: String,
    nonce: String,
    nonce_signature: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result = log_in_existing_device_helper(
        user_id,
        device_id,
        nonce,
        nonce_signature,
      )
      .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

async fn log_in_password_user_helper(
  password_user_info: LogInPasswordUserInfo,
) -> Result<String, Error> {
  let mut client_login = Login::new();
  let opaque_login_request = client_login
    .start(&password_user_info.password)
    .map_err(crate::handle_error)?;
  let login_start_request = OpaqueLoginStartRequest {
    opaque_login_request,
    username: password_user_info.username,
    device_key_upload: Some(password_user_info.device_keys.into()),
    force: None,
  };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let response = identity_client
    .log_in_password_user_start(login_start_request)
    .await?;

  let login_start_response = response.into_inner();

  let opaque_login_upload = client_login
    .finish(&login_start_response.opaque_login_response)
    .map_err(crate::handle_error)?;

  let login_finish_request = OpaqueLoginFinishRequest {
    session_id: login_start_response.session_id,
    opaque_login_upload,
  };

  let login_finish_response = identity_client
    .log_in_password_user_finish(login_finish_request)
    .await?
    .into_inner();
  let auth_result = IdentityAuthResult::from(login_finish_response);
  Ok(serde_json::to_string(&auth_result)?)
}

async fn log_in_wallet_user_helper(
  wallet_user_info: LogInWalletUserInfo,
) -> Result<String, Error> {
  let login_request = WalletAuthRequest {
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_key_upload: Some(wallet_user_info.device_keys.into()),
    farcaster_id: None,
    initial_device_list: "".to_string(),
  };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let login_response = identity_client
    .log_in_wallet_user(login_request)
    .await?
    .into_inner();

  let auth_result = IdentityAuthResult::from(login_response);
  Ok(serde_json::to_string(&auth_result)?)
}

async fn restore_user_helper(
  wallet_user_info: RestoreUserInfo,
) -> Result<String, Error> {
  let restore_request = RestoreUserRequest {
    user_id: wallet_user_info.user_id,
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_list: wallet_user_info.device_list,
    device_key_upload: Some(wallet_user_info.device_keys.into()),
    // TODO: Replace empty defaults with actual values
    new_backup_id: "".to_string(),
    encrypted_user_keys: Vec::<u8>::new(),
    siwe_backup_msg: None,
  };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let auth_response = identity_client
    .restore_user(restore_request)
    .await?
    .into_inner();

  let auth_result = IdentityAuthResult::from(auth_response);
  Ok(serde_json::to_string(&auth_result)?)
}

async fn upload_secondary_device_keys_and_log_in_helper(
  user_id: String,
  nonce: String,
  nonce_signature: String,
  device_key_upload: DeviceKeyUpload,
) -> Result<String, Error> {
  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let request = SecondaryDeviceKeysUploadRequest {
    user_id,
    nonce,
    nonce_signature,
    device_key_upload: Some(device_key_upload),
  };

  let response = identity_client
    .upload_keys_for_registered_device_and_log_in(request)
    .await?
    .into_inner();

  let auth_result = IdentityAuthResult::from(response);
  Ok(serde_json::to_string(&auth_result)?)
}

async fn log_in_existing_device_helper(
  user_id: String,
  device_id: String,
  nonce: String,
  nonce_signature: String,
) -> Result<String, Error> {
  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let request = ExistingDeviceLoginRequest {
    user_id,
    device_id,
    nonce,
    nonce_signature,
  };

  let response = identity_client
    .log_in_existing_device(request)
    .await?
    .into_inner();

  let auth_result = IdentityAuthResult::from(response);
  Ok(serde_json::to_string(&auth_result)?)
}
