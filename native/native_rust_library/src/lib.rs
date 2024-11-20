use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use grpc_clients::identity::protos::unauth::DeviceType;
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

#[allow(clippy::too_many_arguments)]
#[cxx::bridge]
mod ffi {

  // Identity Service APIs
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
      initial_device_list: String,
      promise_id: u32,
    );

    #[cxx_name = "identityRegisterReservedPasswordUser"]
    fn register_reserved_password_user(
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
      initial_device_list: String,
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

    #[cxx_name = "identityRestoreUser"]
    fn restore_user(
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
    );

    #[cxx_name = "identityUpdateUserPassword"]
    fn update_user_password(
      user_id: String,
      device_id: String,
      access_token: String,
      old_password: String,
      new_password: String,
      promise_id: u32,
    );

    #[cxx_name = "identityDeleteWalletUser"]
    fn delete_wallet_user(
      user_id: String,
      device_id: String,
      access_token: String,
      promise_id: u32,
    );

    #[cxx_name = "identityDeletePasswordUser"]
    fn delete_password_user(
      user_id: String,
      device_id: String,
      access_token: String,
      password: String,
      promise_id: u32,
    );

    #[cxx_name = "identityLogOut"]
    fn log_out(
      user_id: String,
      device_id: String,
      access_token: String,
      promise_id: u32,
    );

    #[cxx_name = "identityLogOutPrimaryDevice"]
    fn log_out_primary_device(
      user_id: String,
      device_id: String,
      access_token: String,
      signed_device_list: String,
      promise_id: u32,
    );

    #[cxx_name = "identityLogOutSecondaryDevice"]
    fn log_out_secondary_device(
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

    #[cxx_name = "identityGetDeviceListsForUsers"]
    fn get_device_lists_for_users(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      user_ids: Vec<String>,
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

    #[cxx_name = "identitySyncPlatformDetails"]
    fn sync_platform_details(
      auth_user_id: String,
      auth_device_id: String,
      auth_access_token: String,
      promise_id: u32,
    );

    #[cxx_name = "identityUploadSecondaryDeviceKeysAndLogIn"]
    fn upload_secondary_device_keys_and_log_in(
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
    );

    #[cxx_name = "identityLogInExistingDevice"]
    fn log_in_existing_device(
      user_id: String,
      device_id: String,
      nonce: String,
      nonce_signature: String,
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

    #[cxx_name = "identityFindUserIdentities"]
    fn find_user_identities(
      user_id: String,
      device_id: String,
      access_token: String,
      user_ids: Vec<String>,
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
      siwe_backup_msg: String,
      promise_id: u32,
    );

    #[cxx_name = "createUserKeysBackup"]
    fn create_user_keys_backup(
      backup_id: String,
      backup_secret: String,
      pickle_key: String,
      pickled_account: String,
      siwe_backup_msg: String,
      promise_id: u32,
    );

    #[cxx_name = "restoreBackupData"]
    fn restore_backup_data(
      backup_id: String,
      backup_data_key: String,
      backup_log_data_key: String,
      max_version: String,
      promise_id: u32,
    );

    #[cxx_name = "retrieveBackupKeys"]
    fn retrieve_backup_keys(
      backup_secret: String,
      backup_id: String,
      promise_id: u32,
    );

    #[cxx_name = "retrieveLatestBackupInfo"]
    fn retrieve_latest_backup_info(user_identifier: String, promise_id: u32);
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

    #[cxx_name = "getSIWEBackupMessagePath"]
    fn get_siwe_backup_message_path(backup_id: &str) -> Result<String>;

    #[cxx_name = "createMainCompaction"]
    fn create_main_compaction(backup_id: &str, future_id: usize);

    #[cxx_name = "restoreFromMainCompaction"]
    fn restore_from_main_compaction(
      main_compaction_path: &str,
      main_compaction_encryption_key: &str,
      max_version: &str,
      future_id: usize,
    );

    #[cxx_name = "restoreFromBackupLog"]
    fn restore_from_backup_log(backup_log: Vec<u8>, future_id: usize);

    #[cxx_name = "setBackupID"]
    fn set_backup_id(backup_id: &str, future_id: usize);
  }

  // Future handling from C++
  extern "Rust" {
    #[cxx_name = "resolveUnitFuture"]
    fn resolve_unit_future(future_id: usize);

    #[cxx_name = "rejectFuture"]
    fn reject_future(future_id: usize, error: String);
  }
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
#[allow(clippy::assertions_on_constants)]
mod tests {
  use super::{BACKUP_SOCKET_ADDR, CODE_VERSION, IDENTITY_SOCKET_ADDR};

  #[test]
  fn test_code_version_exists() {
    assert!(CODE_VERSION > 0);
  }

  #[test]
  fn test_identity_socket_addr_exists() {
    assert!(!IDENTITY_SOCKET_ADDR.is_empty());
    assert!(!BACKUP_SOCKET_ADDR.is_empty());
  }
}
