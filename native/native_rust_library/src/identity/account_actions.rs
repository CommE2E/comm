use comm_opaque2::client::{Login, Registration};
use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::auth::{
  DeletePasswordUserFinishRequest, DeletePasswordUserStartRequest,
  PrimaryDeviceLogoutRequest, UpdateUserPasswordFinishRequest,
  UpdateUserPasswordStartRequest,
};
use grpc_clients::identity::protos::unauth::Empty;

use crate::identity::AuthInfo;
use crate::utils::jsi_callbacks::handle_void_result_as_callback;
use crate::{Error, IDENTITY_SOCKET_ADDR, RUNTIME};

use super::PLATFORM_METADATA;

pub mod ffi {
  use super::*;

  pub fn update_user_password(
    user_id: String,
    device_id: String,
    access_token: String,
    old_password: String,
    new_password: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let update_password_info = UpdatePasswordInfo {
        access_token,
        user_id,
        device_id,
        old_password,
        new_password,
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

  pub fn delete_password_user(
    user_id: String,
    device_id: String,
    access_token: String,
    password: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token,
        user_id,
        device_id,
      };
      let result = delete_password_user_helper(auth_info, password).await;
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
      let result = log_out_helper(auth_info, LogOutType::Legacy).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  pub fn log_out_primary_device(
    user_id: String,
    device_id: String,
    access_token: String,
    signed_device_list: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let auth_info = AuthInfo {
        access_token,
        user_id,
        device_id,
      };
      let result = log_out_helper(
        auth_info,
        LogOutType::PrimaryDevice { signed_device_list },
      )
      .await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  pub fn log_out_secondary_device(
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
      let result = log_out_helper(auth_info, LogOutType::SecondaryDevice).await;
      handle_void_result_as_callback(result, promise_id);
    });
  }
}

struct UpdatePasswordInfo {
  user_id: String,
  device_id: String,
  access_token: String,
  old_password: String,
  new_password: String,
}

async fn update_user_password_helper(
  update_password_info: UpdatePasswordInfo,
) -> Result<(), Error> {
  let mut client_login = Login::new();
  let opaque_login_request = client_login
    .start(&update_password_info.old_password)
    .map_err(crate::handle_error)?;

  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&update_password_info.new_password)
    .map_err(crate::handle_error)?;

  let update_password_start_request = UpdateUserPasswordStartRequest {
    opaque_login_request,
    opaque_registration_request,
  };
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    update_password_info.user_id,
    update_password_info.device_id,
    update_password_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  let response = identity_client
    .update_user_password_start(update_password_start_request)
    .await?;

  let update_password_start_response = response.into_inner();

  let opaque_login_upload = client_login
    .finish(&update_password_start_response.opaque_login_response)
    .map_err(crate::handle_error)?;

  let opaque_registration_upload = client_registration
    .finish(
      &update_password_info.new_password,
      &update_password_start_response.opaque_registration_response,
    )
    .map_err(crate::handle_error)?;

  let update_password_finish_request = UpdateUserPasswordFinishRequest {
    session_id: update_password_start_response.session_id,
    opaque_login_upload,
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
    PLATFORM_METADATA.clone(),
  )
  .await?;
  identity_client.delete_wallet_user(Empty {}).await?;

  Ok(())
}

async fn delete_password_user_helper(
  auth_info: AuthInfo,
  password: String,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  let mut client_login = Login::new();
  let opaque_login_request =
    client_login.start(&password).map_err(crate::handle_error)?;

  let delete_start_request = DeletePasswordUserStartRequest {
    opaque_login_request,
  };

  let response = identity_client
    .delete_password_user_start(delete_start_request)
    .await?;

  let delete_start_response = response.into_inner();

  let opaque_login_upload = client_login
    .finish(&delete_start_response.opaque_login_response)
    .map_err(crate::handle_error)?;

  let delete_finish_request = DeletePasswordUserFinishRequest {
    session_id: delete_start_response.session_id,
    opaque_login_upload,
  };

  identity_client
    .delete_password_user_finish(delete_finish_request)
    .await?;

  Ok(())
}

enum LogOutType {
  Legacy,
  PrimaryDevice { signed_device_list: String },
  SecondaryDevice,
}

async fn log_out_helper(
  auth_info: AuthInfo,
  log_out_type: LogOutType,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    PLATFORM_METADATA.clone(),
  )
  .await?;

  match log_out_type {
    LogOutType::Legacy => identity_client.log_out_user(Empty {}).await?,
    LogOutType::SecondaryDevice => {
      identity_client.log_out_secondary_device(Empty {}).await?
    }
    LogOutType::PrimaryDevice { signed_device_list } => {
      let request = PrimaryDeviceLogoutRequest { signed_device_list };
      identity_client.log_out_primary_device(request).await?
    }
  };

  Ok(())
}
