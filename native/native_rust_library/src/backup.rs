mod compaction_upload_promises;
mod file_info;
mod upload_handler;

use crate::argon2_tools::{compute_backup_key, compute_backup_key_str};
use crate::backup::compaction_upload_promises::CompactionUploadPromises;
use crate::constants::{aes, secure_store};
use crate::ffi::{
  create_main_compaction, get_backup_user_keys_file_path, secure_store_get,
  void_callback,
};
use crate::handle_string_result_as_callback;
use crate::BACKUP_SOCKET_ADDR;
use crate::RUNTIME;
use backup_client::{
  BackupClient, BackupDescriptor, DownloadLogsRequest, LatestBackupIDResponse,
  LogWSResponse, RequestedData, SinkExt, StreamExt, UserIdentity,
};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::error::Error;

lazy_static! {
  static ref COMPACTION_UPLOAD_PROMISES: CompactionUploadPromises =
    Default::default();
}

pub mod ffi {
  use super::*;

  pub use upload_handler::ffi::*;

  /// Creates a new backup compaction
  /// 1. Saves **UserKeys** data to a file
  /// 2. Stores the `promise_id` in [`COMPACTION_UPLOAD_PROMISES`]
  /// 3. Schedules creation of compaction data in C++ database code
  /// 4. C++ will then call [`upload_handler::ffi::on_backup_compaction_creation_finished`]
  /// 5. [`upload_handler`] will send all created files to the backup service
  /// 6. If everything succeeds the promise will be resolved. Otherwise it will be rejected
  ///     with
  pub fn create_backup(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result = save_userkeys(
        backup_id.clone(),
        backup_secret,
        pickle_key,
        pickled_account,
      )
      .await;

      if let Err(err) = result {
        void_callback(err.to_string(), promise_id);
      } else {
        COMPACTION_UPLOAD_PROMISES.insert(backup_id.clone(), promise_id);
        create_main_compaction(&backup_id);
      }
    });
  }

  pub fn restore_backup_sync(backup_secret: String, promise_id: u32) {
    RUNTIME.spawn(async move {
      let result = restore_backup(backup_secret).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

pub async fn save_userkeys(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
) -> Result<(), Box<dyn Error>> {
  let mut backup_key =
    compute_backup_key(backup_secret.as_bytes(), backup_id.as_bytes())?;

  let backup_data_key =
    secure_store_get(secure_store::SECURE_STORE_ENCRYPTION_KEY_ID)?;

  let user_keys = UserKeys {
    backup_data_key,
    pickle_key,
    pickled_account,
  };
  let encrypted_user_keys = user_keys.encrypt(&mut backup_key)?;

  let user_keys_file = get_backup_user_keys_file_path(&backup_id)?;
  tokio::fs::write(user_keys_file, encrypted_user_keys).await?;

  Ok(())
}

pub async fn restore_backup(
  backup_secret: String,
) -> Result<String, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;

  let user_identity = get_user_identity_from_secure_store()?;

  let latest_backup_descriptor = BackupDescriptor::Latest {
    username: user_identity.user_id.clone(),
  };

  let backup_id_response = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::BackupID)
    .await?;

  let LatestBackupIDResponse { backup_id } =
    serde_json::from_slice(&backup_id_response)?;

  let mut backup_key = compute_backup_key_str(&backup_secret, &backup_id)?;

  let mut encrypted_user_keys = backup_client
    .download_backup_data(&latest_backup_descriptor, RequestedData::UserKeys)
    .await?;

  let user_keys =
    UserKeys::from_encrypted(&mut encrypted_user_keys, &mut backup_key)?;

  let backup_data_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let mut encrypted_user_data = backup_client
    .download_backup_data(&backup_data_descriptor, RequestedData::UserData)
    .await?;

  let user_data = decrypt(
    &mut user_keys.backup_data_key.as_bytes().to_vec(),
    &mut encrypted_user_data,
  )?;

  let user_data: serde_json::Value = serde_json::from_slice(&user_data)?;

  let (tx, rx) = backup_client.download_logs(&user_identity).await?;

  tokio::pin!(tx);
  tokio::pin!(rx);

  tx.send(DownloadLogsRequest {
    backup_id: backup_id.clone(),
    from_id: None,
  })
  .await?;

  match rx.next().await {
    Some(Ok(LogWSResponse::LogDownload {
      log_id: 1,
      content,
      attachments: None,
    }))
      if content == (1..100).collect::<Vec<u8>>() => {}
    response => {
      return Err(Box::new(InvalidWSLogResponse(format!("{response:?}"))))
    }
  };

  match rx.next().await {
    Some(Ok(LogWSResponse::LogDownloadFinished { last_log_id: None })) => {}
    response => {
      return Err(Box::new(InvalidWSLogResponse(format!("{response:?}"))))
    }
  };

  Ok(
    json!({
        "userData": user_data,
        "pickleKey": user_keys.pickle_key,
        "pickledAccount": user_keys.pickled_account,
    })
    .to_string(),
  )
}

fn get_user_identity_from_secure_store() -> Result<UserIdentity, cxx::Exception>
{
  Ok(UserIdentity {
    user_id: secure_store_get(secure_store::USER_ID)?,
    access_token: secure_store_get(secure_store::COMM_SERVICES_ACCESS_TOKEN)?,
    device_id: secure_store_get(secure_store::DEVICE_ID)?,
  })
}

#[derive(Debug, Serialize, Deserialize)]
struct UserKeys {
  backup_data_key: String,
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

#[derive(Debug, derive_more::Display)]
struct InvalidWSLogResponse(String);
impl Error for InvalidWSLogResponse {}
