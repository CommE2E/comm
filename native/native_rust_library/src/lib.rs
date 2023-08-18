use crate::ffi::string_callback;
use crate::identity::Empty;
use comm_opaque2::client::{Login, Registration};
use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use lazy_static::lazy_static;
use serde::Serialize;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::{transport::Channel, Status};
use tracing::instrument;

mod argon2_tools;
mod crypto_tools;
mod identity_client;

mod identity {
  tonic::include_proto!("identity.client");
}

use argon2_tools::compute_backup_key;
use crypto_tools::generate_device_id;
use identity::identity_client_service_client::IdentityClientServiceClient;
use identity::{
  DeviceKeyUpload, DeviceType, IdentityKeyInfo, OpaqueLoginFinishRequest,
  OpaqueLoginStartRequest, PreKey, RegistrationFinishRequest,
  RegistrationStartRequest, WalletLoginRequest,
};

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
    // Identity Service Client
    type IdentityClient;

    #[cxx_name = "identityInitializeClient"]
    fn initialize_identity_client(addr: String) -> Box<IdentityClient>;

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

fn generate_nonce(promise_id: u32) {
  RUNTIME.spawn(async move {
    let result = fetch_nonce().await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn fetch_nonce() -> Result<String, Error> {
  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054").await?;
  let nonce = identity_client
    .generate_nonce(Empty {})
    .await?
    .into_inner()
    .nonce;
  Ok(nonce)
}

#[derive(Debug)]
pub struct IdentityClient {
  identity_client: IdentityClientServiceClient<Channel>,
}

fn initialize_identity_client(addr: String) -> Box<IdentityClient> {
  Box::new(IdentityClient {
    identity_client: RUNTIME
      .block_on(IdentityClientServiceClient::connect(addr))
      .unwrap(),
  })
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
struct UserIDAndDeviceAccessToken {
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

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054").await?;
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

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054").await?;
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

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054").await?;
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

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(...)]
  TonicGRPC(Status),
  #[display(...)]
  TonicTransport(tonic::transport::Error),
  #[display(...)]
  SerdeJson(serde_json::Error),
}
