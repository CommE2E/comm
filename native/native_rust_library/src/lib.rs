use crate::ffi::string_callback;
use crate::identity::Empty;
use comm_opaque2::client::Registration;
use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use lazy_static::lazy_static;
use serde::Serialize;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::{transport::Channel, Status};
use tracing::instrument;

mod crypto_tools;
mod identity_client;
mod identity {
  tonic::include_proto!("identity.client");
}

use crypto_tools::generate_device_id;
use identity::identity_client_service_client::IdentityClientServiceClient;
use identity::{
  DeviceKeyUpload, IdentityKeyInfo, PreKey, RegistrationFinishRequest,
  RegistrationStartRequest,
};

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
      identity_prekey: String,
      identity_prekey_signature: String,
      notif_prekey: String,
      notif_prekey_signature: String,
      identity_onetime_keys: Vec<String>,
      notif_onetime_keys: Vec<String>,
      promise_id: u32,
    );

    #[cxx_name = "identityLoginUserPakeBlocking"]
    fn identity_login_user_pake_blocking(
      client: Box<IdentityClient>,
      username: String,
      password: String,
      key_payload: String,
      key_payload_signature: String,
      identity_prekey: String,
      identity_prekey_signature: String,
      notif_prekey: String,
      notif_prekey_signature: String,
      identity_onetime_keys: Vec<String>,
      notif_onetime_keys: Vec<String>,
    ) -> Result<String>;

    #[cxx_name = "identityLoginUserWalletBlocking"]
    fn identity_login_user_wallet_blocking(
      client: Box<IdentityClient>,
      siwe_message: String,
      siwe_signature: String,
      key_payload: String,
      key_payload_signature: String,
      identity_prekey: String,
      identity_prekey_signature: String,
      notif_prekey: String,
      notif_prekey_signature: String,
      identity_onetime_keys: Vec<String>,
      notif_onetime_keys: Vec<String>,
    ) -> Result<String>;

    #[cxx_name = "identityGenerateNonce"]
    fn generate_nonce(promise_id: u32);

    // Crypto Tools
    fn generate_device_id(device_type: DeviceType) -> Result<String>;
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
  identity_prekey: String,
  identity_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  identity_onetime_keys: Vec<String>,
  notif_onetime_keys: Vec<String>,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let register_user_info = RegisterUserInfo {
      username,
      password,
      key_payload,
      key_payload_signature,
      identity_prekey,
      identity_prekey_signature,
      notif_prekey,
      notif_prekey_signature,
      identity_onetime_keys,
      notif_onetime_keys,
    };
    let result = register_user_helper(register_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

struct RegisterUserInfo {
  username: String,
  password: String,
  key_payload: String,
  key_payload_signature: String,
  identity_prekey: String,
  identity_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  identity_onetime_keys: Vec<String>,
  notif_onetime_keys: Vec<String>,
}

#[derive(Serialize)]
struct UserIDAndDeviceAccessToken {
  user_id: String,
  access_token: String,
}

async fn register_user_helper(
  register_user_info: RegisterUserInfo,
) -> Result<String, Error> {
  let mut client_registration = Registration::new();
  let opaque_registration_request = client_registration
    .start(&register_user_info.password)
    .map_err(handle_error)?;
  let registration_start_request = RegistrationStartRequest {
    opaque_registration_request,
    username: register_user_info.username,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: register_user_info.key_payload,
        payload_signature: register_user_info.key_payload_signature,
        social_proof: None,
      }),
      identity_upload: Some(identity::PreKey {
        pre_key: register_user_info.identity_prekey,
        pre_key_signature: register_user_info.identity_prekey_signature,
      }),
      notif_upload: Some(PreKey {
        pre_key: register_user_info.notif_prekey,
        pre_key_signature: register_user_info.notif_prekey_signature,
      }),
      onetime_identity_prekeys: register_user_info.identity_onetime_keys,
      onetime_notif_prekeys: register_user_info.notif_onetime_keys,
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
      &register_user_info.password,
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
fn identity_login_user_pake_blocking(
  client: Box<IdentityClient>,
  username: String,
  password: String,
  key_payload: String,
  key_payload_signature: String,
  identity_prekey: String,
  identity_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  identity_onetime_keys: Vec<String>,
  notif_onetime_keys: Vec<String>,
) -> Result<String, Status> {
  RUNTIME.block_on(identity_client::login_user_pake(
    client,
    username,
    password,
    key_payload,
    key_payload_signature,
    identity_prekey,
    identity_prekey_signature,
    notif_prekey,
    notif_prekey_signature,
    identity_onetime_keys,
    notif_onetime_keys,
  ))
}

#[instrument]
fn identity_login_user_wallet_blocking(
  client: Box<IdentityClient>,
  siwe_message: String,
  siwe_signature: String,
  key_payload: String,
  key_payload_signature: String,
  identity_prekey: String,
  identity_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  identity_onetime_keys: Vec<String>,
  notif_onetime_keys: Vec<String>,
) -> Result<String, Status> {
  RUNTIME.block_on(identity_client::login_user_wallet(
    client,
    siwe_message,
    siwe_signature,
    key_payload,
    key_payload_signature,
    identity_prekey,
    identity_prekey_signature,
    notif_prekey,
    notif_prekey_signature,
    identity_onetime_keys,
    notif_onetime_keys,
  ))
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
