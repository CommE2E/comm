use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use grpc_clients::identity::protos::auth::{
  GetDeviceListRequest, UpdateDeviceListRequest,
};
use grpc_clients::identity::protos::unauth::{
  DeviceKeyUpload, DeviceType, ExistingDeviceLoginRequest, IdentityKeyInfo,
  Prekey, SecondaryDeviceKeysUploadRequest,
};
use grpc_clients::identity::{get_auth_client, get_unauthenticated_client};
use lazy_static::lazy_static;
use std::sync::Arc;
use tokio::runtime::{Builder, Runtime};
use tonic::Status;

mod argon2_tools;
mod backup;
mod constants;
mod identity;
mod utils;

use crate::argon2_tools::compute_backup_key_str;
use crate::identity::{AuthInfo, UserIDAndDeviceAccessToken};
use crate::utils::jsi_callbacks::{
  handle_string_result_as_callback, handle_void_result_as_callback,
};

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

// ffi uses
use backup::ffi::*;
use identity::ffi::*;
use utils::future_manager::ffi::*;

#[cxx::bridge]
mod ffi {

  extern "Rust" {
    #[cxx_name = "identityRegisterPasswordUser"]
    fn register_password_user(
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
      promise_id: u32,
    );

    #[cxx_name = "identityRegisterWalletUser"]
    fn register_wallet_user(
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

    #[cxx_name = "identityLogOut"]
    fn log_out(
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

    #[cxx_name = "identityGetDeviceListForUser"]
    fn get_device_list_for_user(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      user_id: String,
      since_timestamp: i64,
      promise_id: u32,
    );

    #[cxx_name = "identityUpdateDeviceList"]
    fn update_device_list(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      update_payload: String,
      promise_id: u32,
    );

    #[cxx_name = "identityUploadSecondaryDeviceKeysAndLogIn"]
    fn upload_secondary_device_keys_and_log_in(
      user_id: String,
      challenge_response: String,
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

    #[cxx_name = "identityLogInExistingDevice"]
    fn log_in_existing_device(
      user_id: String,
      device_id: String,
      challenge_response: String,
      promise_id: u32,
    );

    #[cxx_name = "identityFindUserIDForWalletAddress"]
    fn find_user_id_for_wallet_address(wallet_address: String, promise_id: u32);

    #[cxx_name = "identityFindUserIDForUsername"]
    fn find_user_id_for_username(username: String, promise_id: u32);

    // Farcaster
    #[cxx_name = "identityGetFarcasterUsers"]
    fn get_farcaster_users(farcaster_ids: Vec<String>, promise_id: u32);

    #[cxx_name = "identityLinkFarcasterAccount"]
    fn link_farcaster_account(
      user_id: String,
      device_id: String,
      access_token: String,
      farcaster_id: String,
      promise_id: u32,
    );

    #[cxx_name = "identityUnlinkFarcasterAccount"]
    fn unlink_farcaster_account(
      user_id: String,
      device_id: String,
      access_token: String,
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
    fn restore_backup(backup_secret: String, promise_id: u32);

    #[cxx_name = "restoreBackupData"]
    fn restore_backup_data(
      backup_id: String,
      backup_data_key: String,
      backup_log_data_key: String,
      promise_id: u32,
    );

    #[cxx_name = "retrieveBackupKeys"]
    fn retrieve_backup_keys(backup_secret: String, promise_id: u32);
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

    #[cxx_name = "restoreFromMainCompaction"]
    fn restore_from_main_compaction(
      main_compaction_path: &str,
      main_compaction_encryption_key: &str,
      future_id: usize,
    );

    #[cxx_name = "restoreFromBackupLog"]
    fn restore_from_backup_log(backup_log: Vec<u8>, future_id: usize);
  }

  // Future handling from C++
  extern "Rust" {
    #[cxx_name = "resolveUnitFuture"]
    fn resolve_unit_future(future_id: usize);

    #[cxx_name = "rejectFuture"]
    fn reject_future(future_id: usize, error: String);
  }
}

fn get_device_list_for_user(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  user_id: String,
  since_timestamp: i64,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let auth_info = AuthInfo {
      access_token: auth_access_token,
      user_id: auth_user_id,
      device_id: auth_device_id,
    };
    let since_timestamp = Option::from(since_timestamp).filter(|&t| t > 0);
    let result =
      get_device_list_for_user_helper(auth_info, user_id, since_timestamp)
        .await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn get_device_list_for_user_helper(
  auth_info: AuthInfo,
  user_id: String,
  since_timestamp: Option<i64>,
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
    .get_device_list_for_user(GetDeviceListRequest {
      user_id,
      since_timestamp,
    })
    .await?
    .into_inner();

  let payload = serde_json::to_string(&response.device_list_updates)?;
  Ok(payload)
}

fn update_device_list(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  update_payload: String,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let auth_info = AuthInfo {
      access_token: auth_access_token,
      user_id: auth_user_id,
      device_id: auth_device_id,
    };
    let result = update_device_list_helper(auth_info, update_payload).await;
    handle_void_result_as_callback(result, promise_id);
  });
}

async fn update_device_list_helper(
  auth_info: AuthInfo,
  update_payload: String,
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

  let update_request = UpdateDeviceListRequest {
    new_device_list: update_payload,
  };

  identity_client.update_device_list(update_request).await?;

  Ok(())
}

fn upload_secondary_device_keys_and_log_in(
  user_id: String,
  challenge_response: String,
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
        social_proof: None,
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
      challenge_response,
      device_key_upload,
    )
    .await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn upload_secondary_device_keys_and_log_in_helper(
  user_id: String,
  challenge_response: String,
  device_key_upload: DeviceKeyUpload,
) -> Result<String, Error> {
  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let request = SecondaryDeviceKeysUploadRequest {
    user_id,
    challenge_response,
    device_key_upload: Some(device_key_upload),
  };

  let response = identity_client
    .upload_keys_for_registered_device_and_log_in(request)
    .await?
    .into_inner();

  let user_id_and_access_token = UserIDAndDeviceAccessToken::from(response);
  Ok(serde_json::to_string(&user_id_and_access_token)?)
}

fn log_in_existing_device(
  user_id: String,
  device_id: String,
  challenge_response: String,
  promise_id: u32,
) {
  RUNTIME.spawn(async move {
    let result =
      log_in_existing_device_helper(user_id, device_id, challenge_response)
        .await;
    handle_string_result_as_callback(result, promise_id);
  });
}

async fn log_in_existing_device_helper(
  user_id: String,
  device_id: String,
  challenge_response: String,
) -> Result<String, Error> {
  let mut identity_client = get_unauthenticated_client(
    IDENTITY_SOCKET_ADDR,
    CODE_VERSION,
    DEVICE_TYPE.as_str_name().to_lowercase(),
  )
  .await?;

  let request = ExistingDeviceLoginRequest {
    user_id,
    device_id,
    challenge_response,
  };

  let response = identity_client
    .log_in_existing_device(request)
    .await?
    .into_inner();

  let user_id_and_access_token = UserIDAndDeviceAccessToken::from(response);
  Ok(serde_json::to_string(&user_id_and_access_token)?)
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
