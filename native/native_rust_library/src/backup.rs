mod compaction_upload_promises;
mod file_info;
mod upload_handler;

use crate::argon2_tools::{compute_backup_key, compute_backup_key_str};
use crate::constants::{aes, secure_store};
use crate::ffi::{
  create_main_compaction, generate_backup_data_key,
  generate_backup_log_data_key, get_backup_directory_path,
  get_backup_user_keys_file_path, get_siwe_backup_message_path,
  restore_from_backup_log, restore_from_main_compaction, secure_store_get,
  set_backup_id, string_callback, void_callback,
};
use crate::utils::future_manager;
use crate::utils::jsi_callbacks::handle_string_result_as_callback;
use crate::BACKUP_SOCKET_ADDR;
use crate::RUNTIME;
use backup_client::{
  BackupClient, BackupDescriptor, BackupVersionInfo, LatestBackupInfoResponse,
  RequestedData, TryStreamExt, UserIdentity,
};
use serde::{Deserialize, Serialize};
use siwe::Message;
use std::error::Error;
use std::path::PathBuf;

/// Wrapper for calling async C++ ffi functions. Returns awaitable future.
/// The C++ defined function should accept `future_id` as the last argument.
macro_rules! async_cpp_call {
  ($func:ident($($args:expr),*)) => {
    {
      let (future_id, future) = future_manager::new_future::<()>().await;
      $func($($args,)* future_id);
      future
    }
  };
}

pub mod ffi {
  use std::convert::Infallible;

  use super::*;

  pub use upload_handler::ffi::*;

  fn handle_backup_creation_error(backup_id: String, err: String) {
    compaction_upload_promises::resolve(&backup_id, Err(err));
    tokio::spawn(upload_handler::compaction::cleanup_files(backup_id));
  }

  async fn prepare_user_keys_backup(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    siwe_backup_msg: String,
    use_random_keys: bool,
  ) -> Result<(String, String), String> {
    let backup_data_key =
      generate_backup_data_key().map_err(|e| e.to_string())?;
    let backup_log_data_key =
      generate_backup_log_data_key().map_err(|e| e.to_string())?;

    let result = create_user_keys_compaction(
      backup_id.clone(),
      backup_secret,
      pickle_key,
      pickled_account,
      Some(&backup_data_key).filter(|_| use_random_keys).cloned(),
      Some(&backup_log_data_key)
        .filter(|_| use_random_keys)
        .cloned(),
    )
    .await
    .map_err(|err| err.to_string());

    if let Err(err) = result {
      handle_backup_creation_error(backup_id.clone(), err.to_string());
      return Err(err);
    }

    if !siwe_backup_msg.is_empty() {
      if let Err(err) =
        create_siwe_backup_msg_compaction(&backup_id, siwe_backup_msg).await
      {
        handle_backup_creation_error(backup_id.clone(), err.to_string());
        return Err(err.to_string());
      }
    }

    Ok((backup_data_key, backup_log_data_key))
  }

  pub fn create_backup(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    siwe_backup_msg: String,
    compaction_promise_id: u32,
    upload_promise_id: u32,
  ) {
    compaction_upload_promises::insert(backup_id.clone(), upload_promise_id);

    RUNTIME.spawn(async move {
      let Ok((backup_data_key, backup_log_data_key)) =
        prepare_user_keys_backup(
          backup_id.clone(),
          backup_secret,
          pickle_key,
          pickled_account,
          siwe_backup_msg.clone(),
          true,
        )
        .await
      else {
        return;
      };

      let future = async_cpp_call!(create_main_compaction(
        &backup_id,
        &backup_data_key,
        &backup_log_data_key
      ));
      if let Err(err) = future.await {
        handle_string_result_as_callback(
          Err::<String, _>(err.to_string()),
          compaction_promise_id,
        );
        handle_backup_creation_error(backup_id.clone(), err.to_string());
        return;
      }

      // resolve compaction creation promise
      handle_string_result_as_callback(
        Ok::<_, Infallible>(backup_id),
        compaction_promise_id,
      );

      trigger_backup_file_upload();
      // The promise will be resolved when the backup is uploaded
    });
  }

  pub fn create_user_keys_backup(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    siwe_backup_msg: String,
    promise_id: u32,
  ) {
    compaction_upload_promises::insert(backup_id.clone(), promise_id);

    RUNTIME.spawn(async move {
      if (prepare_user_keys_backup(
        backup_id.clone(),
        backup_secret,
        pickle_key,
        pickled_account,
        siwe_backup_msg.clone(),
        false,
      )
      .await)
        .is_err()
      {
        return;
      }

      let future = async_cpp_call!(set_backup_id(&backup_id));
      if let Err(err) = future.await {
        handle_backup_creation_error(backup_id.clone(), err.to_string());
        return;
      }

      trigger_backup_file_upload();
      // The promise will be resolved when the backup is uploaded
    });
  }

  pub fn get_backup_user_keys(
    user_identifier: String,
    backup_secret: String,
    backup_id: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result =
        download_backup_keys(user_identifier, backup_secret, backup_id)
          .await
          .map_err(|err| err.to_string());

      let result = match result {
        Ok(result) => result,
        Err(error) => {
          string_callback(error, promise_id, "".to_string());
          return;
        }
      };

      let serialize_result = serde_json::to_string(&result);
      handle_string_result_as_callback(serialize_result, promise_id);
    });
  }

  pub fn restore_backup_data(
    backup_id: String,
    backup_data_key: String,
    backup_log_data_key: String,
    max_version: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let err_string = match restore_backup_data_helper(
        backup_id,
        backup_data_key,
        backup_log_data_key,
        max_version,
      )
      .await
      {
        Ok(()) => "".to_string(),
        Err(error) => error.to_string(),
      };

      void_callback(err_string, promise_id);
    });
  }

  fn get_siwe_backup_data_from_msg(
    siwe_backup_msg: String,
  ) -> Result<SIWEBackupData, String> {
    let siwe_backup_msg_obj: Message = match siwe_backup_msg.parse() {
      Ok(siwe_backup_msg_obj) => siwe_backup_msg_obj,
      Err(error) => {
        return Err(error.to_string());
      }
    };

    let siwe_backup_msg_nonce = siwe_backup_msg_obj.nonce;
    let siwe_backup_msg_statement = match siwe_backup_msg_obj.statement {
      Some(statement) => statement,
      None => {
        return Err("Backup message invalid: missing statement".to_string());
      }
    };

    let siwe_backup_msg_issued_at = siwe_backup_msg_obj.issued_at.to_string();

    Ok(SIWEBackupData {
      siwe_backup_msg_nonce,
      siwe_backup_msg_statement,
      siwe_backup_msg_issued_at,
    })
  }

  pub fn retrieve_latest_backup_info(user_identifier: String, promise_id: u32) {
    RUNTIME.spawn(async move {
      let latest_backup_id_response =
        download_latest_backup_info(user_identifier)
          .await
          .map_err(|err| err.to_string());

      let result = match latest_backup_id_response {
        Ok(Some(result)) => result,
        Ok(None) => {
          string_callback("".to_string(), promise_id, "null".to_string());
          return;
        }
        Err(error) => {
          string_callback(error, promise_id, "".to_string());
          return;
        }
      };

      let LatestBackupInfoResponse {
        backup_id,
        user_id,
        siwe_backup_msg,
        keyserver_device_id,
        creation_timestamp,
        total_backup_size,
        version_info,
      } = result;

      let siwe_backup_data = match siwe_backup_msg {
        Some(siwe_backup_msg_value) => {
          match get_siwe_backup_data_from_msg(siwe_backup_msg_value) {
            Ok(data) => Some(data),
            Err(err) => {
              string_callback(err, promise_id, "".to_string());
              return;
            }
          }
        }
        None => None,
      };

      let result = LatestBackupInfo {
        backup_id,
        user_id,
        siwe_backup_data,
        keyserver_device_id,
        creation_timestamp,
        total_backup_size,
        version_info,
      };

      let serialize_result = serde_json::to_string(&result);
      handle_string_result_as_callback(serialize_result, promise_id);
    });
  }
}

pub async fn get_encrypted_user_keys(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
  backup_data_key: Option<String>,
  backup_log_data_key: Option<String>,
) -> Result<Vec<u8>, Box<dyn Error>> {
  let mut backup_key =
    compute_backup_key(backup_secret.as_bytes(), backup_id.as_bytes())?;

  let backup_data_key = match backup_data_key {
    Some(key) => key,
    None => secure_store_get(secure_store::SECURE_STORE_BACKUP_DATA_KEY_ID)?,
  };

  let backup_log_data_key = match backup_log_data_key {
    Some(key) => key,
    None => {
      secure_store_get(secure_store::SECURE_STORE_BACKUP_LOG_DATA_KEY_ID)?
    }
  };

  let user_keys = UserKeys {
    backup_data_key,
    backup_log_data_key,
    pickle_key,
    pickled_account,
  };
  user_keys.encrypt(&mut backup_key)
}

pub async fn create_user_keys_compaction(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
  backup_data_key: Option<String>,
  backup_log_data_key: Option<String>,
) -> Result<(), Box<dyn Error>> {
  let encrypted_user_keys = get_encrypted_user_keys(
    backup_id.clone(),
    backup_secret,
    pickle_key,
    pickled_account,
    backup_data_key,
    backup_log_data_key,
  )
  .await?;

  let user_keys_file = get_backup_user_keys_file_path(&backup_id)?;
  tokio::fs::write(user_keys_file, encrypted_user_keys).await?;

  Ok(())
}

pub async fn create_ephemeral_user_keys_compaction(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
) -> Result<Vec<u8>, Box<dyn Error>> {
  let encrypted_user_keys = get_encrypted_user_keys(
    backup_id.clone(),
    backup_secret,
    pickle_key,
    pickled_account,
    None,
    None,
  )
  .await?;

  async_cpp_call!(set_backup_id(&backup_id)).await?;

  Ok(encrypted_user_keys)
}

pub async fn create_siwe_backup_msg_compaction(
  backup_id: &str,
  siwe_backup_msg: String,
) -> Result<(), Box<dyn Error>> {
  let siwe_backup_msg_file = get_siwe_backup_message_path(backup_id)?;
  tokio::fs::write(siwe_backup_msg_file, siwe_backup_msg).await?;

  Ok(())
}

async fn download_latest_backup_info(
  user_identifier: String,
) -> Result<Option<LatestBackupInfoResponse>, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;

  let latest_backup_descriptor = BackupDescriptor::Latest { user_identifier };

  let backup_info_response = match backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupInfo)
    .await
  {
    Ok(response) => response,
    Err(err) if err.is_backup_not_found() => return Ok(None),
    Err(err) if err.is_user_not_found() => {
      return Err(Box::new(UserNotFoundError))
    }
    Err(err) => return Err(err.into()),
  };

  let response: LatestBackupInfoResponse =
    serde_json::from_slice(&backup_info_response)?;
  Ok(Some(response))
}

async fn download_backup_keys(
  user_identifier: String,
  backup_secret: String,
  backup_id: String,
) -> Result<UserKeys, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;

  let backup_descriptor = BackupDescriptor::Latest { user_identifier };

  let mut encrypted_user_keys = backup_client
    .download_backup_data(&backup_descriptor, RequestedData::UserKeys)
    .await?;
  let mut backup_key = compute_backup_key_str(&backup_secret, &backup_id)?;
  UserKeys::from_encrypted(&mut encrypted_user_keys, &mut backup_key)
}

async fn download_backup_data(
  backup_id: String,
  backup_restoration_path: &PathBuf,
) -> Result<(), Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  let backup_data_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let encrypted_user_data = backup_client
    .download_backup_data(&backup_data_descriptor, RequestedData::UserData)
    .await?;

  tokio::fs::write(backup_restoration_path, encrypted_user_data).await?;

  Ok(())
}

async fn download_and_apply_logs(
  backup_id: &str,
  backup_log_data_key: String,
) -> Result<(), Box<dyn Error>> {
  let mut backup_log_data_key = backup_log_data_key.into_bytes();

  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  let stream = backup_client.download_logs(&user_identity, backup_id).await;
  let mut stream = Box::pin(stream);

  while let Some(mut log) = stream.try_next().await? {
    let data = decrypt(
      backup_log_data_key.as_mut_slice(),
      log.content.as_mut_slice(),
    )?;

    async_cpp_call!(restore_from_backup_log(data)).await?;
  }

  Ok(())
}

async fn restore_backup_data_helper(
  backup_id: String,
  backup_data_key: String,
  backup_log_data_key: String,
  max_version: String,
) -> Result<(), Box<dyn Error>> {
  let backup_restoration_path =
    PathBuf::from(get_backup_directory_path()?).join("restore_compaction");

  download_backup_data(backup_id.clone(), &backup_restoration_path).await?;

  // downloaded compaction will be removed when this gets out of scope
  let failure_cleanup = comm_lib::tools::Defer::new(|| {
    crate::utils::schedule_remove_file(&backup_restoration_path)
  });

  async_cpp_call!(restore_from_main_compaction(
    &backup_restoration_path.to_string_lossy(),
    &backup_data_key,
    &max_version
  ))
  .await?;

  download_and_apply_logs(&backup_id, backup_log_data_key).await?;

  failure_cleanup.cancel();
  Ok(())
}

fn get_user_identity_from_secure_store() -> Result<UserIdentity, cxx::Exception>
{
  Ok(UserIdentity {
    user_id: secure_store_get(secure_store::USER_ID)?,
    access_token: secure_store_get(secure_store::COMM_SERVICES_ACCESS_TOKEN)?,
    device_id: secure_store_get(secure_store::DEVICE_ID)?,
  })
}

/// helper struct to generate proper error message string
#[derive(Debug, derive_more::Error, derive_more::Display)]
#[display(fmt = "user_not_found")]
struct UserNotFoundError;

// This struct should match `SIWEBackupData` in `lib/types/backup-types.js`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SIWEBackupData {
  siwe_backup_msg_statement: String,
  siwe_backup_msg_nonce: String,
  siwe_backup_msg_issued_at: String,
}

// This struct should match `LatestBackupInfo` in `lib/types/backup-types.js`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LatestBackupInfo {
  #[serde(rename = "backupID")]
  pub backup_id: String,
  #[serde(rename = "userID")]
  pub user_id: String,
  pub siwe_backup_data: Option<SIWEBackupData>,
  #[serde(rename = "keyserverDeviceID")]
  pub keyserver_device_id: Option<String>,
  // ISO 8601 / RFC 3339 DateTime string
  pub creation_timestamp: String,
  pub total_backup_size: u64,
  pub version_info: BackupVersionInfo,
}

/// Stores the Olm account in `pickled_account`. However, Olm account
/// information might be out of date. We have decided we don't need
/// to update this when one-time keys (OTKs) or prekeys change.
/// The reasoning behind this decision is that the backed-up Olm account
/// is primarily used for signing an update to the device list. For these
/// operations only the identity signing key is necessary.
// This struct should match `UserKeys` in `lib/types/backup-types.js`
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserKeys {
  backup_data_key: String,
  backup_log_data_key: String,
  pickle_key: String,
  pickled_account: String,
}

impl UserKeys {
  fn encrypt(&self, backup_key: &mut [u8]) -> Result<Vec<u8>, Box<dyn Error>> {
    let mut json = serde_json::to_vec(self)?;
    encrypt(backup_key, &mut json)
  }

  fn from_encrypted(
    data: &mut [u8],
    backup_key: &mut [u8],
  ) -> Result<Self, Box<dyn Error>> {
    let decrypted = decrypt(backup_key, data)?;
    Ok(serde_json::from_slice(&decrypted)?)
  }
}

fn encrypt(key: &mut [u8], data: &mut [u8]) -> Result<Vec<u8>, Box<dyn Error>> {
  let encrypted_len = data.len() + aes::IV_LENGTH + aes::TAG_LENGTH;
  let mut encrypted = vec![0; encrypted_len];

  crate::ffi::encrypt(key, data, &mut encrypted)?;

  Ok(encrypted)
}

fn decrypt(key: &mut [u8], data: &mut [u8]) -> Result<Vec<u8>, Box<dyn Error>> {
  let decrypted_len = data.len() - aes::IV_LENGTH - aes::TAG_LENGTH;
  let mut decrypted = vec![0; decrypted_len];

  crate::ffi::decrypt(key, data, &mut decrypted)?;

  Ok(decrypted)
}
