use super::file_info::BackupFileInfo;
use super::get_user_identity_from_secure_store;
use crate::backup::compaction_upload_promises;
use crate::constants::BACKUP_SERVICE_CONNECTION_RETRY_DELAY;
use crate::ffi::{
  get_backup_directory_path, get_backup_file_path, get_backup_log_file_path,
  get_backup_user_keys_file_path, get_siwe_backup_message_path,
};
use crate::BACKUP_SOCKET_ADDR;
use crate::RUNTIME;
use backup_client::UserIdentity;
use backup_client::{
  BackupClient, Error as BackupError, LogUploadConfirmation, Stream, StreamExt,
};
use backup_client::{BackupData, Sink, UploadLogRequest};
use lazy_static::lazy_static;
use std::collections::HashSet;
use std::convert::Infallible;
use std::error::Error;
use std::future::Future;
use std::io::BufRead;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use tokio::sync::Notify;
use tokio::task::JoinHandle;

lazy_static! {
  pub static ref UPLOAD_HANDLER: Arc<Mutex<Option<JoinHandle<Infallible>>>> =
    Arc::new(Mutex::new(None));
  static ref TRIGGER_BACKUP_FILE_UPLOAD: Arc<Notify> = Arc::new(Notify::new());
  static ref BACKUP_FOLDER_PATH: PathBuf = PathBuf::from(
    get_backup_directory_path().expect("Getting backup directory path failed")
  );
}

pub mod ffi {
  use super::*;

  pub fn start_backup_handler() -> Result<(), Box<dyn Error>> {
    let mut handle = UPLOAD_HANDLER.lock()?;
    match handle.take() {
      // Don't start backup handler if it's already running
      Some(handle) if !handle.is_finished() => (),
      _ => {
        *handle = Some(RUNTIME.spawn(super::start()?));
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
}

pub fn start() -> Result<impl Future<Output = Infallible>, Box<dyn Error>> {
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

      let mut tx = Box::pin(tx);
      let mut rx = Box::pin(rx);

      let logs_waiting_for_confirmation = Mutex::new(HashSet::<PathBuf>::new());

      loop {
        let err = tokio::select! {
          Err(err) = watch_and_upload_files(&backup_client, &user_identity, &mut tx, &logs_waiting_for_confirmation) => err,
          Err(err) = delete_confirmed_logs(&mut rx, &logs_waiting_for_confirmation) => err,
        };

        println!("Backup handler error: '{err:?}'");
        match err {
          BackupHandlerError::BackupError(_)
          | BackupHandlerError::WSClosed
          | BackupHandlerError::LockError => break,
          BackupHandlerError::IoError(_)
          | BackupHandlerError::CxxException(_) => continue,
          BackupHandlerError::FromUtf8Error(_) => break,
        }
      }

      tokio::time::sleep(BACKUP_SERVICE_CONNECTION_RETRY_DELAY).await;
      println!("Retrying backup log upload");
    }
  })
}

async fn watch_and_upload_files(
  backup_client: &BackupClient,
  user_identity: &UserIdentity,
  tx: &mut Pin<Box<impl Sink<UploadLogRequest, Error = BackupError>>>,
  logs_waiting_for_confirmation: &Mutex<HashSet<PathBuf>>,
) -> Result<Infallible, BackupHandlerError> {
  loop {
    let mut file_stream = match tokio::fs::read_dir(&*BACKUP_FOLDER_PATH).await
    {
      Ok(file_stream) => file_stream,
      Err(err) if err.kind() == ErrorKind::NotFound => {
        TRIGGER_BACKUP_FILE_UPLOAD.notified().await;
        continue;
      }
      Err(err) => return Err(err.into()),
    };

    while let Some(file) = file_stream.next_entry().await? {
      let path = file.path();

      if logs_waiting_for_confirmation.lock()?.contains(&path) {
        continue;
      }

      let Ok(BackupFileInfo {
        backup_id,
        log_id,
        additional_data,
      }) = path.clone().try_into()
      else {
        continue;
      };

      // Skip additional data files (attachments, user keys). They will be
      // handled when we iterate over the corresponding files with the
      // main content
      if additional_data.is_some() {
        continue;
      }

      if let Some(log_id) = log_id {
        log::upload_files(tx, backup_id, log_id).await?;
        logs_waiting_for_confirmation.lock()?.insert(path);
      } else {
        compaction::upload_files(backup_client, user_identity, backup_id)
          .await?;
      }
    }

    TRIGGER_BACKUP_FILE_UPLOAD.notified().await;
  }
}

async fn delete_confirmed_logs(
  rx: &mut Pin<
    Box<impl Stream<Item = Result<LogUploadConfirmation, BackupError>>>,
  >,
  logs_waiting_for_confirmation: &Mutex<HashSet<PathBuf>>,
) -> Result<Infallible, BackupHandlerError> {
  while let Some(LogUploadConfirmation { backup_id, log_id }) =
    rx.next().await.transpose()?
  {
    let path =
      get_backup_log_file_path(&backup_id, &log_id.to_string(), false)?;
    logs_waiting_for_confirmation
      .lock()?
      .remove(&PathBuf::from(path));

    tokio::spawn(log::cleanup_files(backup_id, log_id));
  }

  Err(BackupHandlerError::WSClosed)
}

pub mod compaction {
  use super::*;

  pub async fn upload_files(
    backup_client: &BackupClient,
    user_identity: &UserIdentity,
    backup_id: String,
  ) -> Result<(), BackupHandlerError> {
    let user_data_path = get_backup_file_path(&backup_id, false)?;
    let user_data = match tokio::fs::read(&user_data_path).await {
      Ok(data) => Some(data),
      Err(err) if err.kind() == ErrorKind::NotFound => None,
      Err(err) => return Err(err.into()),
    };
    let user_keys_path = get_backup_user_keys_file_path(&backup_id)?;
    let user_keys = match tokio::fs::read(&user_keys_path).await {
      Ok(data) => Some(data),
      Err(err) if err.kind() == ErrorKind::NotFound => None,
      Err(err) => return Err(err.into()),
    };

    let attachments_path = get_backup_file_path(&backup_id, true)?;
    let attachments = match tokio::fs::read(&attachments_path).await {
      Ok(data) => data.lines().collect::<Result<_, _>>()?,
      Err(err) if err.kind() == ErrorKind::NotFound => Vec::new(),
      Err(err) => return Err(err.into()),
    };

    let siwe_backup_msg_path = get_siwe_backup_message_path(&backup_id)?;
    let siwe_backup_msg = match tokio::fs::read(&siwe_backup_msg_path).await {
      Ok(data) => match String::from_utf8(data) {
        Ok(valid_string) => Some(valid_string),
        Err(err) => return Err(err.into()),
      },
      Err(err) if err.kind() == ErrorKind::NotFound => None,
      Err(err) => return Err(err.into()),
    };

    let backup_data = BackupData {
      backup_id: backup_id.clone(),
      user_data,
      user_keys,
      attachments,
      siwe_backup_msg,
    };

    backup_client
      .upload_backup(user_identity, backup_data)
      .await?;

    compaction_upload_promises::resolve(&backup_id, Ok(()));
    tokio::spawn(cleanup_files(backup_id));

    Ok(())
  }

  async fn remove_file_if_exists(path: &String) -> Result<(), Box<dyn Error>> {
    match tokio::fs::remove_file(path).await {
      Ok(()) => Ok(()),
      Err(err) if err.kind() == ErrorKind::NotFound => Ok(()),
      Err(err) => Err(err.into()),
    }
  }
  pub async fn cleanup_files(backup_id: String) {
    let backup_files_cleanup = async {
      let paths_to_remove = vec![
        get_backup_file_path(&backup_id, false)?,
        get_backup_user_keys_file_path(&backup_id)?,
        get_backup_file_path(&backup_id, true)?,
        get_siwe_backup_message_path(&backup_id)?,
      ];

      for path in paths_to_remove {
        if let Err(e) = remove_file_if_exists(&path).await {
          println!("Error occurred while removing a file: {:?}", e);
        }
      }

      Ok::<(), Box<dyn Error>>(())
    };

    if let Err(err) = backup_files_cleanup.await {
      println!("Error when cleaning up the backup files: {:?}", err);
    }
  }
}

mod log {
  use backup_client::SinkExt;

  use super::*;

  pub async fn upload_files(
    tx: &mut Pin<Box<impl Sink<UploadLogRequest, Error = BackupError>>>,
    backup_id: String,
    log_id: usize,
  ) -> Result<(), BackupHandlerError> {
    let log_id_string = log_id.to_string();
    let content_path =
      get_backup_log_file_path(&backup_id, &log_id_string, false)?;
    let content = tokio::fs::read(&content_path).await?;

    let attachments_path =
      get_backup_log_file_path(&backup_id, &log_id_string, true)?;
    let attachments = match tokio::fs::read(&attachments_path).await {
      Ok(data) => Some(data.lines().collect::<Result<_, _>>()?),
      Err(err) if err.kind() == ErrorKind::NotFound => None,
      Err(err) => return Err(err.into()),
    };

    let log_data = UploadLogRequest {
      backup_id,
      log_id,
      content,
      attachments,
    };
    tx.send(log_data.clone()).await?;

    Ok(())
  }

  pub async fn cleanup_files(backup_id: String, log_id: usize) {
    let backup_files_cleanup = async {
      let log_id = log_id.to_string();

      let path = get_backup_log_file_path(&backup_id, &log_id, false)?;
      tokio::fs::remove_file(&path).await?;

      let attachments_path =
        get_backup_log_file_path(&backup_id, &log_id, true)?;
      match tokio::fs::remove_file(&attachments_path).await {
        Ok(()) => Result::<_, Box<dyn Error>>::Ok(()),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.into()),
      }
    };

    if let Err(err) = backup_files_cleanup.await {
      println!("{err:?}");
    }
  }
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
pub enum BackupHandlerError {
  BackupError(BackupError),
  WSClosed,
  IoError(std::io::Error),
  CxxException(cxx::Exception),
  LockError,
  FromUtf8Error(std::string::FromUtf8Error),
}

impl<T> From<std::sync::PoisonError<T>> for BackupHandlerError {
  fn from(_: std::sync::PoisonError<T>) -> Self {
    Self::LockError
  }
}
