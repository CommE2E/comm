use backup::ffi::*;
use comm_opaque2::client::{Login, Registration};
use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use ffi::{bool_callback, string_callback, void_callback};
use future_manager::ffi::*;
use grpc_clients::identity::protos::authenticated::{
  InboundKeyInfo, InboundKeysForUserRequest, KeyserverKeysResponse,
  OutboundKeyInfo, OutboundKeysForUserRequest, RefreshUserPrekeysRequest,
  UpdateUserPasswordFinishRequest, UpdateUserPasswordStartRequest,
  UploadOneTimeKeysRequest,
};
use grpc_clients::identity::protos::unauth::{
  DeviceKeyUpload, DeviceType, Empty, IdentityKeyInfo,
  OpaqueLoginFinishRequest, OpaqueLoginStartRequest, Prekey,
  RegistrationFinishRequest, RegistrationStartRequest, WalletLoginRequest,
};
use grpc_clients::identity::{
  get_auth_client, get_unauthenticated_client, REQUEST_METADATA_COOKIE_KEY,
  RESPONSE_METADATA_COOKIE_KEY,
};
use lazy_static::lazy_static;
use serde::Serialize;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::{Request, Status};
use tracing::instrument;

mod argon2_tools;
mod backup;
mod constants;
mod future_manager;

use argon2_tools::compute_backup_key_str;

mod generated {
  // We get the CODE_VERSION from this generated file
  include!(concat!(env!("OUT_DIR"), "/version.rs"));
  // We get the IDENTITY_SOCKET_ADDR from this generated file
  include!(concat!(env!("OUT_DIR"), "/socket_config.rs"));
}

pub use generated::CODE_VERSION;
pub use generated::{BACKUP_SOCKET_ADDR, IDENTITY_SOCKET_ADDR};

#[cfg(not(target_os = "android"))]
pub const DEVICE_TYPE: DeviceType = DeviceType::Ios;
#[cfg(target_os = "android")]
pub const DEVICE_TYPE: DeviceType = DeviceType::Android;

lazy_static! {
  static ref RUNTIME: Arc<Runtime> =
    Arc::new(Builder::new_multi_thread().enable_all().build().unwrap());
}

#[cxx::bridge]
mod ffi {

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

    #[cxx_name = "identityLogInPasswordUser"]
    fn log_in_password_user(
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

    #[cxx_name = "identityLogInWalletUser"]
    fn log_in_wallet_user(
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
    );

    #[cxx_name = "identityUpdateUserPassword"]
    fn update_user_password(
      user_id: String,
      device_id: String,
      access_token: String,
      password: String,
      promise_id: u32,
    );

    #[cxx_name = "identityDeleteUser"]
    fn delete_user(
      user_id: String,
      device_id: String,
      access_token: String,
      promise_id: u32,
    );

    #[cxx_name = "identityGetOutboundKeysForUser"]
    fn get_outbound_keys_for_user(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      user_id: String,
      promise_id: u32,
    );

    #[cxx_name = "identityGetInboundKeysForUser"]
    fn get_inbound_keys_for_user(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      user_id: String,
      promise_id: u32,
    );

    #[cxx_name = "identityRefreshUserPrekeys"]
    fn refresh_user_prekeys(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      content_prekey: String,
      content_prekey_signature: String,
      notif_prekey: String,
      notif_prekey_signature: String,
      promise_id: u32,
    );

    #[cxx_name = "identityGenerateNonce"]
    fn generate_nonce(promise_id: u32);

    #[cxx_name = "identityVersionSupported"]
    fn version_supported(promise_id: u32);

    #[cxx_name = "identityUploadOneTimeKeys"]
    fn upload_one_time_keys(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      content_one_time_keys: Vec<String>,
      notif_one_time_keys: Vec<String>,
      promise_id: u32,
    );

    #[cxx_name = "identityGetKeyserverKeys"]
    fn get_keyserver_keys(
      user_id: String,
      device_id: String,
      access_token: String,
      keyserver_id: String,
      promise_id: u32,
    );

    // Argon2
    #[cxx_name = "compute_backup_key"]
    fn compute_backup_key_str(
      password: &str,
      backup_id: &str,
    ) -> Result<[u8; 32]>;
  }

  unsafe extern "C++" {
    include!("RustCallback.h");
    #[namespace = "comm"]
    #[cxx_name = "stringCallback"]
    fn string_callback(error: String, promise_id: u32, ret: String);

    #[namespace = "comm"]
    #[cxx_name = "voidCallback"]
    fn void_callback(error: String, promise_id: u32);

    #[namespace = "comm"]
    #[cxx_name = "boolCallback"]
    fn bool_callback(error: String, promise_id: u32, ret: bool);
  }

  // AES cryptography
  #[namespace = "comm"]
  unsafe extern "C++" {
    include!("RustAESCrypto.h");

    #[allow(unused)]
    #[cxx_name = "aesGenerateKey"]
    fn generate_key(buffer: &mut [u8]) -> Result<()>;

    /// The first two argument aren't mutated but creation of Java ByteBuffer
    /// requires the underlying bytes to be mutable.
    #[allow(unused)]
    #[cxx_name = "aesEncrypt"]
    fn encrypt(
      key: &mut [u8],
      plaintext: &mut [u8],
      sealed_data: &mut [u8],
    ) -> Result<()>;

    /// The first two argument aren't mutated but creation of Java ByteBuffer
    /// requires the underlying bytes to be mutable.
    #[allow(unused)]
    #[cxx_name = "aesDecrypt"]
    fn decrypt(
      key: &mut [u8],
      sealed_data: &mut [u8],
      plaintext: &mut [u8],
    ) -> Result<()>;
  }

  // Comm Services Auth Metadata Emission
  #[namespace = "comm"]
  unsafe extern "C++" {
    include!("RustCSAMetadataEmitter.h");

    #[allow(unused)]
    #[cxx_name = "sendAuthMetadataToJS"]
    fn send_auth_metadata_to_js(
      access_token: String,
      user_id: String,
    ) -> Result<()>;
  }

  // Backup
  extern "Rust" {
    #[cxx_name = "startBackupHandler"]
    fn start_backup_handler() -> Result<()>;
    #[cxx_name = "stopBackupHandler"]
    fn stop_backup_handler() -> Result<()>;

    #[cxx_name = "triggerBackupFileUpload"]
    fn trigger_backup_file_upload();

    #[cxx_name = "createBackup"]
    fn create_backup(
      backup_id: String,
      backup_secret: String,
      pickle_key: String,
      pickled_account: String,
      promise_id: u32,
    );

    #[cxx_name = "restoreBackup"]
    fn restore_backup_sync(backup_secret: String, promise_id: u32);
  }

  // Secure store
  #[namespace = "comm"]
  unsafe extern "C++" {
    include!("RustSecureStore.h");

    #[allow(unused)]
    #[cxx_name = "secureStoreSet"]
    fn secure_store_set(key: &str, value: String) -> Result<()>;

    #[cxx_name = "secureStoreGet"]
    fn secure_store_get(key: &str) -> Result<String>;
  }

  // C++ Backup creation
  #[namespace = "comm"]
  unsafe extern "C++" {
    include!("RustBackupExecutor.h");

    #[cxx_name = "getBackupDirectoryPath"]
    fn get_backup_directory_path() -> Result<String>;

    #[cxx_name = "getBackupFilePath"]
    fn get_backup_file_path(
      backup_id: &str,
      is_attachments: bool,
    ) -> Result<String>;

    #[cxx_name = "getBackupLogFilePath"]
    fn get_backup_log_file_path(
      backup_id: &str,
      log_id: &str,
      is_attachments: bool,
    ) -> Result<String>;

    #[cxx_name = "getBackupUserKeysFilePath"]
    fn get_backup_user_keys_file_path(backup_id: &str) -> Result<String>;

    #[cxx_name = "createMainCompaction"]
    fn create_main_compaction(backup_id: &str, future_id: usize);

    #[allow(unused)]
    #[cxx_name = "restoreFromMainCompaction"]
    fn restore_from_main_compaction(
      main_compaction_path: String,
      main_compaction_encryption_key: String,
    ) -> Result<()>;
  }

  // Future handling from C++
  extern "Rust" {
    #[cxx_name = "resolveUnitFuture"]
    fn resolve_unit_future(future_id: usize);

    #[cxx_name = "rejectFuture"]
    fn reject_future(future_id: usize, error: String);
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

fn handle_bool_result_as_callback<E>(result: Result<bool, E>, promise_id: u32)
where
  E: std::fmt::Display,
{
  match result {
    Err(e) => bool_callback(e.to_string(), promise_id, false),
    Ok(r) => bool_callback("".to_string(), promise_id, r),
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
    IDENTITY_SOCKET_ADDR,
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

fn version_supported(promise_id: u32) {
  RUNTIME.spawn(async move {
    let result = version_supported_helper().await;
    handle_bool_result_as_callback(result, promise_id);
  });
}

async fn version_supported_helper() -> Result<bool, Error> {
  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let response = identity_client.ping(Empty {}).await;
  match response {
    Ok(_) => Ok(true),
    Err(e) => {
      if grpc_clients::error::is_version_unsupported(&e) {
        Ok(false)
      } else {
        Err(e.into())
      }
    }
  }
}

fn get_keyserver_keys(
  user_id: String,
  device_id: String,
  access_token: String,
  keyserver_id: String,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let get_keyserver_keys_request = OutboundKeysForUserRequest {
      user_id: keyserver_id,
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

async fn get_keyserver_keys_helper(
  get_keyserver_keys_request: OutboundKeysForUserRequest,
  auth_info: AuthInfo,
) -> Result<String, Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let response = identity_client
    .get_keyserver_keys(get_keyserver_keys_request)
    .await?
    .into_inner();

  let keyserver_keys = OutboundKeyInfoResponse::try_from(response)?;

  Ok(serde_json::to_string(&keyserver_keys)?)
}

struct AuthInfo {
  user_id: String,
  device_id: String,
  access_token: String,
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

  // We need to get the load balancer cookie from from the response and send it
  // in the subsequent request to ensure it is routed to the same identity
  // service instance as the first request
  let cookie = response
    .metadata()
    .get(RESPONSE_METADATA_COOKIE_KEY)
    .cloned();

  let registration_start_response = response.into_inner();

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

  let mut finish_request = Request::new(registration_finish_request);

  // Cookie won't be available in local dev environments
  if let Some(cookie_metadata) = cookie {
    finish_request
      .metadata_mut()
      .insert(REQUEST_METADATA_COOKIE_KEY, cookie_metadata);
  }

  let registration_finish_response = identity_client
    .register_password_user_finish(finish_request)
    .await?
    .into_inner();
  let user_id_and_access_token = UserIDAndDeviceAccessToken {
    user_id: registration_finish_response.user_id,
    access_token: registration_finish_response.access_token,
  };
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}

#[instrument]
fn log_in_password_user(
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
    let result = log_in_password_user_helper(password_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn log_in_password_user_helper(
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
  };

  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let response = identity_client
    .log_in_password_user_start(login_start_request)
    .await?;

  // We need to get the load balancer cookie from from the response and send it
  // in the subsequent request to ensure it is routed to the same identity
  // service instance as the first request
  let cookie = response
    .metadata()
    .get(RESPONSE_METADATA_COOKIE_KEY)
    .cloned();

  let login_start_response = response.into_inner();

  let opaque_login_upload = client_login
    .finish(&login_start_response.opaque_login_response)
    .map_err(handle_error)?;

  let login_finish_request = OpaqueLoginFinishRequest {
    session_id: login_start_response.session_id,
    opaque_login_upload,
  };

  let mut finish_request = Request::new(login_finish_request);

  // Cookie won't be available in local dev environments
  if let Some(cookie_metadata) = cookie {
    finish_request
      .metadata_mut()
      .insert(REQUEST_METADATA_COOKIE_KEY, cookie_metadata);
  }

  let login_finish_response = identity_client
    .log_in_password_user_finish(finish_request)
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
}

#[instrument]
fn log_in_wallet_user(
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
    };
    let result = log_in_wallet_user_helper(wallet_user_info).await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn log_in_wallet_user_helper(
  wallet_user_info: WalletUserInfo,
) -> Result<String, Error> {
  let login_request = WalletLoginRequest {
    siwe_message: wallet_user_info.siwe_message,
    siwe_signature: wallet_user_info.siwe_signature,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: wallet_user_info.key_payload,
        payload_signature: wallet_user_info.key_payload_signature,
        social_proof: None, // The SIWE message and signature are the social proof
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
  };

  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let login_response = identity_client
    .log_in_wallet_user(login_request)
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

  // We need to get the load balancer cookie from from the response and send it
  // in the subsequent request to ensure it is routed to the same identity
  // service instance as the first request
  let cookie = response
    .metadata()
    .get(RESPONSE_METADATA_COOKIE_KEY)
    .cloned();

  let update_password_start_response = response.into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      &update_password_info.password,
      &update_password_start_response.opaque_registration_response,
    )
    .map_err(handle_error)?;

  let update_password_finish_request = UpdateUserPasswordFinishRequest {
    session_id: update_password_start_response.session_id,
    opaque_registration_upload,
  };

  let mut finish_request = Request::new(update_password_finish_request);

  // Cookie won't be available in local dev environments
  if let Some(cookie_metadata) = cookie {
    finish_request
      .metadata_mut()
      .insert(REQUEST_METADATA_COOKIE_KEY, cookie_metadata);
  }

  identity_client
    .update_user_password_finish(finish_request)
    .await?;

  Ok(())
}

fn delete_user(
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
    let result = delete_user_helper(auth_info).await;
    handle_void_result_as_callback(result, promise_id);
  });
}

async fn delete_user_helper(auth_info: AuthInfo) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  identity_client.delete_user(Empty {}).await?;

  Ok(())
}

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
  pub social_proof: Option<String>,
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
  pub social_proof: Option<String>,
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
      social_proof,
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
      social_proof,
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

fn get_outbound_keys_for_user(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  user_id: String,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let get_outbound_keys_request_info = GetOutboundKeysRequestInfo { user_id };
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

async fn get_outbound_keys_for_user_helper(
  get_outbound_keys_request_info: GetOutboundKeysRequestInfo,
  auth_info: AuthInfo,
) -> Result<String, Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let response = identity_client
    .get_outbound_keys_for_user(OutboundKeysForUserRequest {
      user_id: get_outbound_keys_request_info.user_id,
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

impl TryFrom<InboundKeyInfo> for InboundKeyInfoResponse {
  type Error = Error;

  fn try_from(key_info: InboundKeyInfo) -> Result<Self, Error> {
    let identity_info =
      key_info.identity_info.ok_or(Error::MissingResponseData)?;

    let IdentityKeyInfo {
      payload,
      payload_signature,
      social_proof,
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
      social_proof,
      content_prekey: content_prekey_value,
      content_prekey_signature,
      notif_prekey: notif_prekey_value,
      notif_prekey_signature,
    })
  }
}

fn get_inbound_keys_for_user(
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

async fn get_inbound_keys_for_user_helper(
  get_inbound_keys_request_info: GetInboundKeysRequestInfo,
  auth_info: AuthInfo,
) -> Result<String, Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;
  let response = identity_client
    .get_inbound_keys_for_user(InboundKeysForUserRequest {
      user_id: get_inbound_keys_request_info.user_id,
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

fn refresh_user_prekeys(
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
      new_content_prekeys: Some(Prekey {
        prekey: content_prekey,
        prekey_signature: content_prekey_signature,
      }),
      new_notif_prekeys: Some(Prekey {
        prekey: notif_prekey,
        prekey_signature: notif_prekey_signature,
      }),
    };

    let auth_info = AuthInfo {
      access_token: auth_access_token,
      user_id: auth_user_id,
      device_id: auth_device_id,
    };
    let result = refresh_user_prekeys_helper(refresh_request, auth_info).await;
    handle_void_result_as_callback(result, promise_id);
  });
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
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?
  .refresh_user_prekeys(refresh_request)
  .await?;

  Ok(())
}

#[instrument]
fn upload_one_time_keys(
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

async fn upload_one_time_keys_helper(
  auth_info: AuthInfo,
  upload_request: UploadOneTimeKeysRequest,
) -> Result<(), Error> {
  let mut identity_client = get_auth_client(
    IDENTITY_SOCKET_ADDR,
    auth_info.user_id,
    auth_info.device_id,
    auth_info.access_token,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  identity_client.upload_one_time_keys(upload_request).await?;

  Ok(())
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum Error {
  #[display(fmt = "{}", "_0.message()")]
  TonicGRPC(Status),
  #[display(fmt = "{}", "_0")]
  SerdeJson(serde_json::Error),
  #[display(fmt = "Missing response data")]
  MissingResponseData,
  #[display(fmt = "{}", "_0")]
  GRPClient(grpc_clients::error::Error),
}

#[cfg(test)]
mod tests {
  use super::{BACKUP_SOCKET_ADDR, CODE_VERSION, IDENTITY_SOCKET_ADDR};

  #[test]
  fn test_code_version_exists() {
    assert!(CODE_VERSION > 0);
  }

  #[test]
  fn test_identity_socket_addr_exists() {
    assert!(IDENTITY_SOCKET_ADDR.len() > 0);
    assert!(BACKUP_SOCKET_ADDR.len() > 0);
  }
}
