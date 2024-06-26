mod compaction_upload_promises;
mod file_info;
mod upload_handler;

use crate::argon2_tools::{compute_backup_key, compute_backup_key_str};
use crate::constants::{aes, secure_store};
use crate::ffi::{
  create_main_compaction, get_backup_directory_path,
  get_backup_user_keys_file_path, get_siwe_backup_message_path,
  restore_from_backup_log, restore_from_main_compaction, secure_store_get,
  string_callback, void_callback,
};
use crate::utils::future_manager;
use crate::utils::jsi_callbacks::handle_string_result_as_callback;
use crate::BACKUP_SOCKET_ADDR;
use crate::RUNTIME;
use backup_client::{
  BackupClient, BackupDescriptor, LatestBackupIDResponse, RequestedData,
  TryStreamExt, UserIdentity,
};
use serde::{Deserialize, Serialize};
use siwe::Message;
use std::error::Error;
use std::path::PathBuf;

pub mod ffi {
  use super::*;

  pub use upload_handler::ffi::*;

  pub fn create_backup(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    siwe_backup_msg: String,
    promise_id: u32,
  ) {
    compaction_upload_promises::insert(backup_id.clone(), promise_id);

    RUNTIME.spawn(async move {
      let result = create_userkeys_compaction(
        backup_id.clone(),
        backup_secret,
        pickle_key,
        pickled_account,
      )
      .await
      .map_err(|err| err.to_string());

      if let Err(err) = result {
        compaction_upload_promises::resolve(&backup_id, Err(err));
        return;
      }

      if !siwe_backup_msg.is_empty() {
        if let Err(err) =
          create_siwe_backup_msg_compaction(&backup_id, siwe_backup_msg).await
        {
          compaction_upload_promises::resolve(&backup_id, Err(err.to_string()));
          return;
        }
      }

      let (future_id, future) = future_manager::new_future::<()>().await;
      create_main_compaction(&backup_id, future_id);
      if let Err(err) = future.await {
        compaction_upload_promises::resolve(&backup_id, Err(err));
        tokio::spawn(upload_handler::compaction::cleanup_files(backup_id));
        return;
      }

      trigger_backup_file_upload();

      // The promise will be resolved when the backup is uploaded
    });
  }

  pub fn restore_backup(
    backup_secret: String,
    backup_id: String,
    max_version: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let backup_id = Option::from(backup_id).filter(|it| !it.is_empty());
      let result = download_backup(backup_secret, backup_id)
        .await
        .map_err(|err| err.to_string());

      let result = match result {
        Ok(result) => result,
        Err(error) => {
          void_callback(error, promise_id);
          return;
        }
      };

      let (future_id, future) = future_manager::new_future::<()>().await;
      restore_from_main_compaction(
        &result.backup_restoration_path.to_string_lossy(),
        &result.backup_data_key,
        &max_version,
        future_id,
      );

      if let Err(error) = future.await {
        void_callback(error, promise_id);
        return;
      }

      if let Err(error) =
        download_and_apply_logs(&result.backup_id, result.backup_log_data_key)
          .await
      {
        void_callback(error.to_string(), promise_id);
        return;
      }

      void_callback(String::new(), promise_id);
    });
  }

  pub fn retrieve_backup_keys(backup_secret: String, promise_id: u32) {
    RUNTIME.spawn(async move {
      let latest_backup_id_response = download_latest_backup_id()
        .await
        .map_err(|err| err.to_string());

      let backup_id = match latest_backup_id_response {
        Ok(result) => result.backup_id,
        Err(error) => {
          string_callback(error, promise_id, "".to_string());
          return;
        }
      };

      let result = download_backup_keys(backup_id, backup_secret)
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
      let backup_keys = BackupKeysResult {
        backup_id,
        backup_data_key,
        backup_log_data_key,
      };
      let result = download_backup_data(backup_keys)
        .await
        .map_err(|err| err.to_string());

      let result = match result {
        Ok(result) => result,
        Err(error) => {
          void_callback(error, promise_id);
          return;
        }
      };

      let (future_id, future) = future_manager::new_future::<()>().await;
      restore_from_main_compaction(
        &result.backup_restoration_path.to_string_lossy(),
        &result.backup_data_key,
        &max_version,
        future_id,
      );

      if let Err(error) = future.await {
        void_callback(error, promise_id);
        return;
      }

      if let Err(error) =
        download_and_apply_logs(&result.backup_id, result.backup_log_data_key)
          .await
      {
        void_callback(error.to_string(), promise_id);
        return;
      }

      void_callback(String::new(), promise_id);
    });
  }

  pub fn retrieve_latest_siwe_backup_data(promise_id: u32) {
    RUNTIME.spawn(async move {
      let result = download_latest_backup_id()
        .await
        .map_err(|err| err.to_string());

      let result = match result {
        Ok(result) => result,
        Err(error) => {
          string_callback(error, promise_id, "".to_string());
          return;
        }
      };

      let LatestBackupIDResponse {
        backup_id,
        siwe_backup_msg,
      } = result;

      let siwe_backup_msg_string = match siwe_backup_msg {
        Some(siwe_backup_msg_value) => siwe_backup_msg_value,
        None => {
          string_callback(
            "Backup message unavailable".to_string(),
            promise_id,
            "".to_string(),
          );
          return;
        }
      };

      let siwe_backup_msg_obj: Message = match siwe_backup_msg_string.parse() {
        Ok(siwe_backup_msg_obj) => siwe_backup_msg_obj,
        Err(error) => {
          string_callback(error.to_string(), promise_id, "".to_string());
          return;
        }
      };

      let siwe_backup_msg_nonce = siwe_backup_msg_obj.nonce;
      let siwe_backup_msg_statement = match siwe_backup_msg_obj.statement {
        Some(statement) => statement,
        None => {
          string_callback(
            "Backup message invalid: missing statement".to_string(),
            promise_id,
            "".to_string(),
          );
          return;
        }
      };

      let siwe_backup_msg_issued_at = siwe_backup_msg_obj.issued_at.to_string();

      let siwe_backup_data = SIWEBackupData {
        backup_id: backup_id,
        siwe_backup_msg: siwe_backup_msg_string,
        siwe_backup_msg_nonce: siwe_backup_msg_nonce,
        siwe_backup_msg_statement: siwe_backup_msg_statement,
        siwe_backup_msg_issued_at: siwe_backup_msg_issued_at,
      };

      let serialize_result = serde_json::to_string(&siwe_backup_data);
      handle_string_result_as_callback(serialize_result, promise_id);
    });
  }
}

pub async fn create_userkeys_compaction(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
) -> Result<(), Box<dyn Error>> {
  let mut backup_key =
    compute_backup_key(backup_secret.as_bytes(), backup_id.as_bytes())?;

  let backup_data_key =
    secure_store_get(secure_store::SECURE_STORE_ENCRYPTION_KEY_ID)?;

  let backup_log_data_key =
    secure_store_get(secure_store::SECURE_STORE_BACKUP_LOGS_ENCRYPTION_KEY_ID)?;

  let user_keys = UserKeys {
    backup_data_key,
    backup_log_data_key,
    pickle_key,
    pickled_account,
  };
  let encrypted_user_keys = user_keys.encrypt(&mut backup_key)?;

  let user_keys_file = get_backup_user_keys_file_path(&backup_id)?;
  tokio::fs::write(user_keys_file, encrypted_user_keys).await?;

  Ok(())
}

pub async fn create_siwe_backup_msg_compaction(
  backup_id: &str,
  siwe_backup_msg: String,
) -> Result<(), Box<dyn Error>> {
  let siwe_backup_msg_file = get_siwe_backup_message_path(backup_id)?;
  tokio::fs::write(siwe_backup_msg_file, siwe_backup_msg).await?;

  Ok(())
}

async fn download_backup(
  backup_secret: String,
  backup_id: Option<String>,
) -> Result<CompactionDownloadResult, Box<dyn Error>> {
  let backup_id = match backup_id {
    Some(backup_id) => backup_id,
    None => {
      let latest_backup_id_response = download_latest_backup_id().await?;
      latest_backup_id_response.backup_id
    }
  };

  let backup_keys = download_backup_keys(backup_id, backup_secret).await?;
  download_backup_data(backup_keys).await
}

async fn download_latest_backup_id(
) -> Result<LatestBackupIDResponse, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  let latest_backup_descriptor = BackupDescriptor::Latest {
    username: user_identity.user_id.clone(),
  };

  let backup_id_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupID)
    .await?;

  let LatestBackupIDResponse {
    backup_id,
    siwe_backup_msg,
  } = serde_json::from_slice(&backup_id_response)?;

  Ok(LatestBackupIDResponse {
    backup_id,
    siwe_backup_msg,
  })
}

async fn download_backup_keys(
  backup_id: String,
  backup_secret: String,
) -> Result<BackupKeysResult, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  let latest_backup_descriptor = BackupDescriptor::Latest {
    username: user_identity.user_id.clone(),
  };

  let mut encrypted_user_keys = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::UserKeys)
    .await?;
  let mut backup_key = compute_backup_key_str(&backup_secret, &backup_id)?;
  let user_keys =
    UserKeys::from_encrypted(&mut encrypted_user_keys, &mut backup_key)?;

  Ok(BackupKeysResult {
    backup_id,
    backup_data_key: user_keys.backup_data_key,
    backup_log_data_key: user_keys.backup_log_data_key,
  })
}

async fn download_backup_data(
  backup_keys: BackupKeysResult,
) -> Result<CompactionDownloadResult, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  let BackupKeysResult {
    backup_id,
    backup_data_key,
    backup_log_data_key,
  } = backup_keys;

  let backup_data_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let encrypted_user_data = backup_client
    .download_backup_data(&backup_data_descriptor, RequestedData::UserData)
    .await?;

  let backup_restoration_path =
    PathBuf::from(get_backup_directory_path()?).join("restore_compaction");

  tokio::fs::write(&backup_restoration_path, encrypted_user_data).await?;

  Ok(CompactionDownloadResult {
    backup_restoration_path,
    backup_id,
    backup_data_key,
    backup_log_data_key,
  })
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

    let (future_id, future) = future_manager::new_future::<()>().await;
    restore_from_backup_log(data, future_id);
    future.await?;
  }

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

// This struct should match `BackupKeys` in `lib/types/backup-types.js`
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupKeysResult {
  #[serde(rename = "backupID")]
  backup_id: String,
  backup_data_key: String,
  backup_log_data_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SIWEBackupData {
  #[serde(rename = "backupID")]
  backup_id: String,
  siwe_backup_msg: String,
  siwe_backup_msg_statement: String,
  siwe_backup_msg_nonce: String,
  siwe_backup_msg_issued_at: String,
}

struct CompactionDownloadResult {
  backup_id: String,
  backup_restoration_path: PathBuf,
  backup_data_key: String,
  backup_log_data_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
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
