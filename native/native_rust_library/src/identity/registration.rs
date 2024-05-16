use crate::{
  utils::jsi_callbacks::handle_string_result_as_callback, Error, CODE_VERSION,
  DEVICE_TYPE, IDENTITY_SOCKET_ADDR, RUNTIME,
};
use comm_opaque2::client::Registration;
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::unauth::{
    DeviceKeyUpload, IdentityKeyInfo, Prekey, RegistrationFinishRequest,
    RegistrationStartRequest, WalletAuthRequest,
  },
};
use tracing::instrument;

use super::{
  farcaster::farcaster_id_string_to_option, PasswordUserInfo,
  UserIDAndDeviceAccessToken, WalletUserInfo,
};

pub mod ffi {
  use super::*;

  #[instrument]
  pub fn register_password_user(
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
    farcaster_id: String,
    initial_device_list: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let password_user_info = PasswordUserInfo {
        username,
        password,
        key_payload,
        key_payload_signature,
        content_prekey,
        content_prekey_signature,
        notif_prekey,
        notif_prekey_signature,
        content_one_time_keys,
        notif_one_time_keys,
        farcaster_id: farcaster_id_string_to_option(&farcaster_id),
      };
      let result =
        register_password_user_helper(password_user_info, initial_device_list)
          .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  #[instrument]
  pub fn register_wallet_user(
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
    farcaster_id: String,
    initial_device_list: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let wallet_user_info = WalletUserInfo {
        siwe_message,
        siwe_signature,
        key_payload,
        key_payload_signature,
        content_prekey,
        content_prekey_signature,
        notif_prekey,
        notif_prekey_signature,
        content_one_time_keys,
        notif_one_time_keys,
        farcaster_id: farcaster_id_string_to_option(&farcaster_id),
      };
      let result =
        register_wallet_user_helper(wallet_user_info, initial_device_list)
          .await;
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

async fn register_password_user_helper(
  password_user_info: PasswordUserInfo,
  initial_device_list: String,
) -> Result<String, Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&password_user_info.password)
    .map_err(crate::handle_error)?;
  let registration_start_request = RegistrationStartRequest {
    opaque_registration_request,
    username: password_user_info.username,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: password_user_info.key_payload,
        payload_signature: password_user_info.key_payload_signature,
      }),
      content_upload: Some(Prekey {
        prekey: password_user_info.content_prekey,
        prekey_signature: password_user_info.content_prekey_signature,
      }),
      notif_upload: Some(Prekey {
        prekey: password_user_info.notif_prekey,
        prekey_signature: password_user_info.notif_prekey_signature,
      }),
      one_time_content_prekeys: password_user_info.content_one_time_keys,
      one_time_notif_prekeys: password_user_info.notif_one_time_keys,
      device_type: DEVICE_TYPE.into(),
    }),
    farcaster_id: password_user_info.farcaster_id,
    initial_device_list,
  };

  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let response = identity_client
    .register_password_user_start(registration_start_request)
    .await?;

  let registration_start_response = response.into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      &password_user_info.password,
      &registration_start_response.opaque_registration_response,
    )
    .map_err(crate::handle_error)?;

  let registration_finish_request = RegistrationFinishRequest {
    session_id: registration_start_response.session_id,
    opaque_registration_upload,
  };

  let registration_finish_response = identity_client
    .register_password_user_finish(registration_finish_request)
    .await?
    .into_inner();
  let user_id_and_access_token =
    UserIDAndDeviceAccessToken::from(registration_finish_response);
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}

async fn register_wallet_user_helper(
  wallet_user_info: WalletUserInfo,
  initial_device_list: String,
) -> Result<String, Error> {
  let registration_request = WalletAuthRequest {
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: wallet_user_info.key_payload,
        payload_signature: wallet_user_info.key_payload_signature,
      }),
      content_upload: Some(Prekey {
        prekey: wallet_user_info.content_prekey,
        prekey_signature: wallet_user_info.content_prekey_signature,
      }),
      notif_upload: Some(Prekey {
        prekey: wallet_user_info.notif_prekey,
        prekey_signature: wallet_user_info.notif_prekey_signature,
      }),
      one_time_content_prekeys: wallet_user_info.content_one_time_keys,
      one_time_notif_prekeys: wallet_user_info.notif_one_time_keys,
      device_type: DEVICE_TYPE.into(),
    }),
    farcaster_id: wallet_user_info.farcaster_id,
    initial_device_list,
  };

  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let registration_response = identity_client
    .register_wallet_user(registration_request)
    .await?
    .into_inner();

  let user_id_and_access_token = UserIDAndDeviceAccessToken {
    user_id: registration_response.user_id,
    access_token: registration_response.access_token,
  };
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}
