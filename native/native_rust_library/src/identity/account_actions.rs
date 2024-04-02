use comm_opaque2::client::Registration;
use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::auth::{
  UpdateUserPasswordFinishRequest, UpdateUserPasswordStartRequest,
};
use grpc_clients::identity::protos::unauth::Empty;

use crate::identity::AuthInfo;
use crate::utils::jsi_callbacks::handle_void_result_as_callback;
use crate::{Error, CODE_VERSION, DEVICE_TYPE, IDENTITY_SOCKET_ADDR, RUNTIME};

pub mod ffi {
  use super::*;

  pub fn update_user_password(
    user_id: String,
    device_id: String,
    access_token: String,
    password: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let update_password_info = UpdatePasswordInfo {
        access_token,
        user_id,
        device_id,
        password,
      };
      let result = update_user_password_helper(update_password_info).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  pub fn delete_wallet_user(
    user_id: String,
    device_id: String,
    access_token: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token,
        user_id,
        device_id,
      };
      let result = delete_wallet_user_helper(auth_info).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  pub fn log_out(
    user_id: String,
    device_id: String,
    access_token: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token,
        user_id,
        device_id,
      };
      let result = log_out_helper(auth_info).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }
}

struct UpdatePasswordInfo {
  user_id: String,
  device_id: String,
  access_token: String,
  password: String,
}

async fn update_user_password_helper(
  update_password_info: UpdatePasswordInfo,
) -> Result<(), Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&update_password_info.password)
    .map_err(crate::handle_error)?;
  let update_password_start_request = UpdateUserPasswordStartRequest {
    opaque_registration_request,
  };
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    update_password_info.user_id,
    update_password_info.device_id,
    update_password_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let response = identity_client
    .update_user_password_start(update_password_start_request)
    .await?;

  let update_password_start_response = response.into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      &update_password_info.password,
      &update_password_start_response.opaque_registration_response,
    )
    .map_err(crate::handle_error)?;

  let update_password_finish_request = UpdateUserPasswordFinishRequest {
    session_id: update_password_start_response.session_id,
    opaque_registration_upload,
  };

  identity_client
    .update_user_password_finish(update_password_finish_request)
    .await?;

  Ok(())
}

async fn delete_wallet_user_helper(auth_info: AuthInfo) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  identity_client.delete_wallet_user(Empty {}).await?;

  Ok(())
}

async fn log_out_helper(auth_info: AuthInfo) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  identity_client.log_out_user(Empty {}).await?;

  Ok(())
}
