use crate::{
  utils::jsi_callbacks::handle_string_result_as_callback, Error,
  IDENTITY_SOCKET_ADDR, RUNTIME,
};
use comm_opaque2::client::Registration;
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::unauth::{
    RegistrationFinishRequest, RegistrationStartRequest,
    ReservedRegistrationStartRequest, WalletAuthRequest,
  },
};
use tracing::instrument;

use super::{
  farcaster::possibly_empty_string_to_option, IdentityAuthResult,
  RegisterPasswordUserInfo, RegisterReservedPasswordUserInfo,
  RegisterWalletUserInfo, PLATFORM_METADATA,
};

#[allow(clippy::too_many_arguments)]
pub mod ffi {
  use crate::identity::{
    DeviceKeys, RegisterPasswordUserInfo, RegisterReservedPasswordUserInfo,
    RegisterWalletUserInfo,
  };

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
    farcaster_dcs_token: String,
  ) {
    RUNTIME.spawn(async move {
      let password_user_info = RegisterPasswordUserInfo {
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
        farcaster_id: possibly_empty_string_to_option(&farcaster_id),
        initial_device_list,
        farcaster_dcs_token: possibly_empty_string_to_option(
          &farcaster_dcs_token,
        ),
      };
      let result = register_password_user_helper(password_user_info).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }

  #[instrument]
  pub fn register_reserved_password_user(
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
    keyserver_message: String,
    keyserver_signature: String,
    initial_device_list: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let password_user_info = RegisterReservedPasswordUserInfo {
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
        keyserver_message,
        keyserver_signature,
        initial_device_list,
      };
      let result =
        register_reserved_password_user_helper(password_user_info).await;
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
    farcaster_dcs_token: String,
  ) {
    RUNTIME.spawn(async move {
      let wallet_user_info = RegisterWalletUserInfo {
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
        farcaster_id: possibly_empty_string_to_option(&farcaster_id),
        initial_device_list,
        farcaster_dcs_token: possibly_empty_string_to_option(
          &farcaster_dcs_token,
        ),
      };
      let result = register_wallet_user_helper(wallet_user_info).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

async fn register_password_user_helper(
  password_user_info: RegisterPasswordUserInfo,
) -> Result<String, Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&password_user_info.password)
    .map_err(crate::handle_error)?;
  let registration_start_request = RegistrationStartRequest {
    opaque_registration_request,
    username: password_user_info.username,
    device_key_upload: Some(password_user_info.device_keys.into()),
    farcaster_id: password_user_info.farcaster_id,
    initial_device_list: password_user_info.initial_device_list,
    farcaster_dcs_token: password_user_info.farcaster_dcs_token,
  };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
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
  let auth_result = IdentityAuthResult::from(registration_finish_response);
  Ok(serde_json::to_string(&auth_result)?)
}

async fn register_reserved_password_user_helper(
  password_user_info: RegisterReservedPasswordUserInfo,
) -> Result<String, Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&password_user_info.password)
    .map_err(crate::handle_error)?;
  let registration_start_request = ReservedRegistrationStartRequest {
    opaque_registration_request,
    username: password_user_info.username,
    device_key_upload: Some(password_user_info.device_keys.into()),
    keyserver_message: password_user_info.keyserver_message,
    keyserver_signature: password_user_info.keyserver_signature,
    initial_device_list: password_user_info.initial_device_list,
  };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;
  let response = identity_client
    .register_reserved_password_user_start(registration_start_request)
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
  let auth_result = IdentityAuthResult::from(registration_finish_response);
  Ok(serde_json::to_string(&auth_result)?)
}

async fn register_wallet_user_helper(
  wallet_user_info: RegisterWalletUserInfo,
) -> Result<String, Error> {
  let registration_request = WalletAuthRequest {
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_key_upload: Some(wallet_user_info.device_keys.into()),
    farcaster_id: wallet_user_info.farcaster_id,
    initial_device_list: wallet_user_info.initial_device_list,
    farcaster_dcs_token: wallet_user_info.farcaster_dcs_token,
  };

  let mut identity_client =
    get_unauthenticated_client(IDENTITY_SOCKET_ADDR, PLATFORM_METADATA.clone())
      .await?;

  let registration_response = identity_client
    .register_wallet_user(registration_request)
    .await?
    .into_inner();

  let auth_result = IdentityAuthResult::from(registration_response);
  Ok(serde_json::to_string(&auth_result)?)
}
