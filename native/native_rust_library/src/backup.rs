use crate::argon2_tools::{compute_backup_key, compute_backup_key_str};
use crate::constants::{
  aes, secure_store, BACKUP_SERVICE_CONNECTION_RETRY_DELAY,
};
use crate::ffi::secure_store_get;
use crate::BACKUP_SOCKET_ADDR;
use crate::RUNTIME;
use crate::{handle_string_result_as_callback, handle_void_result_as_callback};
use backup_client::{
  BackupClient, BackupData, BackupDescriptor, DownloadLogsRequest,
  Error as BackupError, LatestBackupIDResponse, LogUploadConfirmation,
  LogWSResponse, RequestedData, SinkExt, Stream, StreamExt, UploadLogRequest,
  UserIdentity, WSError,
};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::convert::Infallible;
use std::error::Error;
use std::future::{self, Future};
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use tokio::sync::Notify;
use tokio::task::JoinHandle;

pub mod ffi {
  use super::*;

  pub fn start_backup_handler() -> Result<(), Box<dyn Error>> {
    let mut handle = UPLOAD_HANDLER.lock()?;
    match handle.take() {
      // Don't start backup handler if it's already running
      Some(handle) if !handle.is_finished() => (),
      _ => {
        *handle = Some(RUNTIME.spawn(backup_upload_handler()?));
      }
    }

    Ok(())
  }

  pub fn stop_backup_handler() -> Result<(), Box<dyn Error>> {
    let Some(handler) = UPLOAD_HANDLER.lock()?.take() else {
      return Ok(());
    };
    if handler.is_finished() {
      return Ok(());
    }

    handler.abort();
    Ok(())
  }

  pub fn trigger_backup_file_upload() {
    TRIGGER_BACKUP_FILE_UPLOAD.notify_one();
  }

  pub fn create_backup_sync(
    backup_id: String,
    backup_secret: String,
    pickle_key: String,
    pickled_account: String,
    user_data: String,
    promise_id: u32,
  ) {
    RUNTIME.spawn(async move {
      let result = create_backup(
        backup_id,
        backup_secret,
        pickle_key,
        pickled_account,
        user_data,
      )
      .await;
      handle_void_result_as_callback(result, promise_id);
    });
  }

  pub fn restore_backup_sync(backup_secret: String, promise_id: u32) {
    RUNTIME.spawn(async move {
      let result = restore_backup(backup_secret).await;
      handle_string_result_as_callback(result, promise_id);
    });
  }
}

lazy_static! {
  static ref UPLOAD_HANDLER: Arc<Mutex<Option<JoinHandle<Infallible>>>> =
    Arc::new(Mutex::new(None));
  static ref TRIGGER_BACKUP_FILE_UPLOAD: Arc<Notify> = Arc::new(Notify::new());
}

fn backup_upload_handler(
) -> Result<impl Future<Output = Infallible>, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  Ok(async move {
    loop {
      let (tx, rx) = match backup_client.upload_logs(&user_identity).await {
        Ok(ws) => ws,
        Err(err) => {
          println!(
            "Backup handler error when estabilishing connection: '{err:?}'"
          );
          tokio::time::sleep(BACKUP_SERVICE_CONNECTION_RETRY_DELAY).await;
          continue;
        }
      };

      let mut _tx = Box::pin(tx);
      let mut rx = Box::pin(rx);

      let err = tokio::select! {
        Err(err) = backup_data_sender() => err,
        Err(err) = backup_confirmation_receiver(&mut rx) => err,
      };

      println!("Backup handler error: '{err:?}'");

      tokio::time::sleep(BACKUP_SERVICE_CONNECTION_RETRY_DELAY).await;
      println!("Retrying backup log upload");
    }
  })
}

async fn backup_data_sender() -> Result<Infallible, BackupHandlerError> {
  loop {
    let () = future::pending().await;
  }
}

async fn backup_confirmation_receiver(
  rx: &mut Pin<Box<impl Stream<Item = Result<LogUploadConfirmation, WSError>>>>,
) -> Result<Infallible, BackupHandlerError> {
  while let Some(_) = rx.next().await.transpose()? {}

  Err(BackupHandlerError::WSClosed)
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
enum BackupHandlerError {
  BackupError(BackupError),
  BackupWSError(WSError),
  WSClosed,
}

pub async fn create_backup(
  backup_id: String,
  backup_secret: String,
  pickle_key: String,
  pickled_account: String,
  user_data: String,
) -> Result<(), Box<dyn Error>> {
  let mut backup_key =
    compute_backup_key(backup_secret.as_bytes(), backup_id.as_bytes())?;

  let mut user_data = user_data.into_bytes();

  let mut backup_data_key = [0; aes::KEY_SIZE];
  crate::ffi::generate_key(&mut backup_data_key)?;
  let encrypted_user_data = encrypt(&mut backup_data_key, &mut user_data)?;

  let user_keys = UserKeys {
    backup_data_key,
    pickle_key,
    pickled_account,
  };
  let encrypted_user_keys = user_keys.encrypt(&mut backup_key)?;

  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;

  let user_identity = get_user_identity_from_secure_store()?;

  let backup_data = BackupData {
    backup_id: backup_id.clone(),
    user_data: encrypted_user_data,
    user_keys: encrypted_user_keys,
    attachments: Vec::new(),
  };

  backup_client
    .upload_backup(&user_identity, backup_data)
    .await?;

  let (tx, rx) = backup_client.upload_logs(&user_identity).await?;

  tokio::pin!(tx);
  tokio::pin!(rx);

  let log_data = UploadLogRequest {
    backup_id: backup_id.clone(),
    log_id: 1,
    content: (1..100).collect(),
    attachments: None,
  };
  tx.send(log_data.clone()).await?;
  match rx.next().await {
    Some(Ok(LogUploadConfirmation {
      backup_id: response_backup_id,
      log_id: 1,
    }))
      if backup_id == response_backup_id =>
    {
      // Correctly uploaded
    }
    response => {
      return Err(Box::new(InvalidWSLogResponse(format!("{response:?}"))))
    }
  };

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

  let mut user_keys =
    UserKeys::from_encrypted(&mut encrypted_user_keys, &mut backup_key)?;

  let backup_data_descriptor = BackupDescriptor::BackupID {
    backup_id: backup_id.clone(),
    user_identity: user_identity.clone(),
  };

  let mut encrypted_user_data = backup_client
    .download_backup_data(&backup_data_descriptor, RequestedData::UserData)
    .await?;

  let user_data =
    decrypt(&mut user_keys.backup_data_key, &mut encrypted_user_data)?;

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
  backup_data_key: [u8; 32],
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
