use crate::ffi::{string_callback, void_callback};
use comm_opaque2::client::{Login, Registration};
use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use grpc_clients::identity::get_unauthenticated_client;
use grpc_clients::identity::protos::client::{
  DeviceKeyUpload, DeviceType, Empty, IdentityKeyInfo,
  OpaqueLoginFinishRequest, OpaqueLoginStartRequest, PreKey,
  RegistrationFinishRequest, RegistrationStartRequest,
  UpdateUserPasswordFinishRequest, UpdateUserPasswordStartRequest,
  WalletLoginRequest,
};
use lazy_static::lazy_static;
use serde::Serialize;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::Status;
use tracing::instrument;

mod argon2_tools;
mod crypto_tools;

use argon2_tools::compute_backup_key;
use crypto_tools::generate_device_id;

mod generated {
  // We get the CODE_VERSION from this generated file
  include!(concat!(env!("OUT_DIR"), "/version.rs"));
}

pub use generated::CODE_VERSION;

#[cfg(not(feature = "android"))]
pub const DEVICE_TYPE: DeviceType = DeviceType::Ios;
#[cfg(feature = "android")]
pub const DEVICE_TYPE: DeviceType = DeviceType::Android;

lazy_static! {
  pub static ref RUNTIME: Arc<Runtime> = Arc::new(
    Builder::new_multi_thread()
      .worker_threads(1)
      .max_blocking_threads(1)
      .enable_all()
      .build()
      .unwrap()
  );
}

#[cxx::bridge]
mod ffi {

  enum DeviceType {
    KEYSERVER,
    WEB,
    MOBILE,
  }

  extern "Rust" {
    #[cxx_name = "identityRegisterUser"]
    fn register_user(
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
    );

    #[cxx_name = "identityLoginPasswordUser"]
    fn login_password_user(
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
    );

    #[cxx_name = "identityLoginWalletUser"]
    fn login_wallet_user(
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
      social_proof: String,
      promise_id: u32,
    );

    #[cxx_name = "identityUpdateUserPassword"]
    fn update_user_password(
      user_id: String,
      device_id: String,
      access_token: String,
      password: String,
      promise_id: u32,
    );

    #[cxx_name = "identityGenerateNonce"]
    fn generate_nonce(promise_id: u32);

    // Crypto Tools
    fn generate_device_id(device_type: DeviceType) -> Result<String>;

    // Argon2
    fn compute_backup_key(password: &str, backup_id: &str) -> Result<[u8; 32]>;
  }

  unsafe extern "C++" {
    include!("RustCallback.h");
    #[namespace = "comm"]
    #[cxx_name = "stringCallback"]
    fn string_callback(error: String, promise_id: u32, ret: String);

    #[namespace = "comm"]
    #[cxx_name = "voidCallback"]
    fn void_callback(error: String, promise_id: u32);
  }
}

fn handle_string_result_as_callback<E>(
  result: Result<String, E>,
  promise_id: u32,
) where
  E: std::fmt::Display,
{
  match result {
    Err(e) => string_callback(e.to_string(), promise_id, "".to_string()),
    Ok(r) => string_callback("".to_string(), promise_id, r),
  }
}

fn handle_void_result_as_callback<E>(result: Result<(), E>, promise_id: u32)
where
  E: std::fmt::Display,
{
  match result {
    Err(e) => void_callback(e.to_string(), promise_id),
    Ok(_) => void_callback("".to_string(), promise_id),
  }
}

fn generate_nonce(promise_id: u32) {
  RUNTIME.spawn(async move {
    let result = fetch_nonce().await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn fetch_nonce() -> Result<String, Error> {
  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let nonce = identity_client
    .generate_nonce(Empty {})
    .await?
    .into_inner()
    .nonce;
  Ok(nonce)
}

#[instrument]
fn register_user(
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
    };
    let result = register_user_helper(password_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

struct PasswordUserInfo {
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
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserIDAndDeviceAccessToken {
  #[serde(rename = "userID")]
  user_id: String,
  access_token: String,
}

async fn register_user_helper(
  password_user_info: PasswordUserInfo,
) -> Result<String, Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&password_user_info.password)
    .map_err(handle_error)?;
  let registration_start_request = RegistrationStartRequest {
    opaque_registration_request,
    username: password_user_info.username,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: password_user_info.key_payload,
        payload_signature: password_user_info.key_payload_signature,
        social_proof: None,
      }),
      content_upload: Some(PreKey {
        pre_key: password_user_info.content_prekey,
        pre_key_signature: password_user_info.content_prekey_signature,
      }),
      notif_upload: Some(PreKey {
        pre_key: password_user_info.notif_prekey,
        pre_key_signature: password_user_info.notif_prekey_signature,
      }),
      one_time_content_prekeys: password_user_info.content_one_time_keys,
      one_time_notif_prekeys: password_user_info.notif_one_time_keys,
      device_type: DEVICE_TYPE.into(),
    }),
  };

  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let registration_start_response = identity_client
    .register_password_user_start(registration_start_request)
    .await?
    .into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      &password_user_info.password,
      &registration_start_response.opaque_registration_response,
    )
    .map_err(handle_error)?;
  let registration_finish_request = RegistrationFinishRequest {
    session_id: registration_start_response.session_id,
    opaque_registration_upload,
  };

  let registration_finish_response = identity_client
    .register_password_user_finish(registration_finish_request)
    .await?
    .into_inner();
  let user_id_and_access_token = UserIDAndDeviceAccessToken {
    user_id: registration_finish_response.user_id,
    access_token: registration_finish_response.access_token,
  };
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}

#[instrument]
fn login_password_user(
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
    };
    let result = login_password_user_helper(password_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn login_password_user_helper(
  password_user_info: PasswordUserInfo,
) -> Result<String, Error> {
  let mut client_login = Login::new();
  let opaque_login_request = client_login
    .start(&password_user_info.password)
    .map_err(handle_error)?;
  let login_start_request = OpaqueLoginStartRequest {
    opaque_login_request,
    username: password_user_info.username,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: password_user_info.key_payload,
        payload_signature: password_user_info.key_payload_signature,
        social_proof: None,
      }),
      content_upload: Some(PreKey {
        pre_key: password_user_info.content_prekey,
        pre_key_signature: password_user_info.content_prekey_signature,
      }),
      notif_upload: Some(PreKey {
        pre_key: password_user_info.notif_prekey,
        pre_key_signature: password_user_info.notif_prekey_signature,
      }),
      one_time_content_prekeys: password_user_info.content_one_time_keys,
      one_time_notif_prekeys: password_user_info.notif_one_time_keys,
      device_type: DEVICE_TYPE.into(),
    }),
  };

  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let login_start_response = identity_client
    .login_password_user_start(login_start_request)
    .await?
    .into_inner();

  let opaque_login_upload = client_login
    .finish(&login_start_response.opaque_login_response)
    .map_err(handle_error)?;
  let login_finish_request = OpaqueLoginFinishRequest {
    session_id: login_start_response.session_id,
    opaque_login_upload,
  };

  let login_finish_response = identity_client
    .login_password_user_finish(login_finish_request)
    .await?
    .into_inner();
  let user_id_and_access_token = UserIDAndDeviceAccessToken {
    user_id: login_finish_response.user_id,
    access_token: login_finish_response.access_token,
  };
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}

struct WalletUserInfo {
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
  social_proof: String,
}

#[instrument]
fn login_wallet_user(
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
  social_proof: String,
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
      social_proof,
    };
    let result = login_wallet_user_helper(wallet_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn login_wallet_user_helper(
  wallet_user_info: WalletUserInfo,
) -> Result<String, Error> {
  let login_request = WalletLoginRequest {
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: wallet_user_info.key_payload,
        payload_signature: wallet_user_info.key_payload_signature,
        social_proof: Some(wallet_user_info.social_proof),
      }),
      content_upload: Some(PreKey {
        pre_key: wallet_user_info.content_prekey,
        pre_key_signature: wallet_user_info.content_prekey_signature,
      }),
      notif_upload: Some(PreKey {
        pre_key: wallet_user_info.notif_prekey,
        pre_key_signature: wallet_user_info.notif_prekey_signature,
      }),
      one_time_content_prekeys: wallet_user_info.content_one_time_keys,
      one_time_notif_prekeys: wallet_user_info.notif_one_time_keys,
      device_type: DEVICE_TYPE.into(),
    }),
  };

  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let login_response = identity_client
    .login_wallet_user(login_request)
    .await?
    .into_inner();

  let user_id_and_access_token = UserIDAndDeviceAccessToken {
    user_id: login_response.user_id,
    access_token: login_response.access_token,
  };
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}

struct UpdatePasswordInfo {
  user_id: String,
  device_id: String,
  access_token: String,
  password: String,
}

fn update_user_password(
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

async fn update_user_password_helper(
  update_password_info: UpdatePasswordInfo,
) -> Result<(), Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&update_password_info.password)
    .map_err(handle_error)?;
  let update_password_start_request = UpdateUserPasswordStartRequest {
    opaque_registration_request,
    access_token: update_password_info.access_token,
    user_id: update_password_info.user_id,
    device_id_key: update_password_info.device_id,
  };
  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let update_password_start_respone = identity_client
    .update_user_password_start(update_password_start_request)
    .await?
    .into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      &update_password_info.password,
      &update_password_start_respone.opaque_registration_response,
    )
    .map_err(handle_error)?;
  let update_password_finish_request = UpdateUserPasswordFinishRequest {
    session_id: update_password_start_respone.session_id,
    opaque_registration_upload,
  };

  identity_client
    .update_user_password_finish(update_password_finish_request)
    .await?;

  Ok(())
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  TonicGRPC(Status),
  #[display(...)]
  SerdeJson(serde_json::Error),
  #[display(...)]
  GRPClient(grpc_clients::error::Error),
}

#[cfg(test)]
mod tests {
  use super::CODE_VERSION;

  #[test]
  fn test_code_version_exists() {
    assert!(CODE_VERSION > 0);
  }
}
