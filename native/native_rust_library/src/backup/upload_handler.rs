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
use std::sync::{Arc, LazyLock, Mutex};
use tokio::sync::{Mutex as AsyncMutex, Notify};
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

lazy_static! {
  static ref TRIGGER_BACKUP_FILE_UPLOAD: Arc<Notify> = Arc::new(Notify::new());
  static ref BACKUP_FOLDER_PATH: PathBuf = PathBuf::from(
    get_backup_directory_path().expect("Getting backup directory path failed")
  );
}
static BACKUP_HANDLER: LazyLock<BackupHandler> =
  LazyLock::new(BackupHandler::new);

pub mod ffi {
  use super::*;

  pub fn start_backup_handler() -> Result<(), Box<dyn Error>> {
    BACKUP_HANDLER.start_if_not_running(super::start_handler_routine)?;
    Ok(())
  }

  pub fn stop_backup_handler() -> Result<(), Box<dyn Error>> {
    BACKUP_HANDLER.stop()?;
    Ok(())
  }

  pub fn trigger_backup_file_upload() {
    TRIGGER_BACKUP_FILE_UPLOAD.notify_one();
  }
}

type TaskResult<'err, T> = Result<T, Box<dyn Error + 'err>>;

struct BackupHandlerTask {
  handle: JoinHandle<()>,
  cancel_token: tokio_util::sync::CancellationToken,
  task_id: u32,
}

struct BackupHandler {
  task: Arc<Mutex<Option<BackupHandlerTask>>>,
}

impl BackupHandlerTask {
  /// True if task hasn't finished and isn't pending cancelation
  fn is_active(&self) -> bool {
    !self.handle.is_finished() && !self.cancel_token.is_cancelled()
  }

  /// Requests this task routine to gracefully stop
  fn request_stop(&self) {
    self.cancel_token.cancel();
  }

  /// Creates a backup handler task and asynchronously starts it
  fn start_new<'task, F>(
    prev_task: Option<BackupHandlerTask>,
    routine: impl FnOnce(u32, CancellationToken) -> TaskResult<'task, F>,
  ) -> TaskResult<'task, Self>
  where
    F: Future<Output = ()> + Send + 'static,
  {
    let cancel_token = CancellationToken::new();
    let task_id = prev_task.as_ref().map_or(1, |prev| prev.task_id + 1);

    let routine_future = routine(task_id, cancel_token.clone())?;
    let handle = RUNTIME.spawn(async move {
      // previous task might still be running, wait for it to complete
      if let Some(prev_task) = prev_task {
        if let Err(cancel_reason) = prev_task.handle.await {
          println!(
            "Backup handler task {} has just been unexpectedly canceled: {:?}",
            prev_task.task_id, cancel_reason
          );
        }
      }
      // start the new task
      routine_future.await
    });

    Ok(BackupHandlerTask {
      handle,
      task_id,
      cancel_token,
    })
  }
}

impl<'task> BackupHandler {
  pub fn new() -> Self {
    Self {
      task: Arc::new(Mutex::new(None)),
    }
  }

  pub fn start_if_not_running<F>(
    &'task self,
    routine: impl FnOnce(u32, CancellationToken) -> TaskResult<'task, F>,
  ) -> TaskResult<'task, ()>
  where
    F: Future<Output = ()> + Send + 'static,
  {
    let mut task = self.task.lock()?;

    let prev_task = if let Some(prev_task) = &*task {
      // There might be situation that task is still running
      // but is pending cancelation
      let is_canceled = prev_task.cancel_token.is_cancelled();
      if !prev_task.handle.is_finished() && !is_canceled {
        return Ok(());
      }

      task.take()
    } else {
      None
    };

    let new_task = BackupHandlerTask::start_new(prev_task, routine)?;
    *task = Some(new_task);

    Ok(())
  }

  fn stop(&'task self) -> TaskResult<'task, ()> {
    let Some(task) = &*self.task.lock()? else {
      return Ok(());
    };
    if !task.is_active() {
      return Ok(());
    }

    task.request_stop();
    Ok(())
  }
}

pub fn start_handler_routine(
  task_id: u32,
  cancel_token: CancellationToken,
) -> Result<impl Future<Output = ()>, Box<dyn Error>> {
  let backup_client = BackupClient::new(BACKUP_SOCKET_ADDR)?;
  let user_identity = get_user_identity_from_secure_store()?;

  Ok(async move {
    println!("Backup handler task id={task_id} started.");
    'task_loop: loop {
      let logs_upload_stream = tokio::select!(
        result = backup_client.upload_logs(&user_identity) => result,
        _ = cancel_token.cancelled() => { break 'task_loop; }
      );
      let (tx, rx) = match logs_upload_stream {
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

      let logs_waiting_for_confirmation =
        AsyncMutex::new(HashSet::<PathBuf>::new());

      loop {
        let err = tokio::select! {
          Err(err) = watch_and_upload_files(&backup_client, &user_identity, &mut tx, &logs_waiting_for_confirmation) => err,
          Err(err) = delete_confirmed_logs(&mut rx, &logs_waiting_for_confirmation) => err,
          _ = cancel_token.cancelled() => { break 'task_loop; }
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

      tokio::select!(
        _ = tokio::time::sleep(BACKUP_SERVICE_CONNECTION_RETRY_DELAY) => (),
        _ = cancel_token.cancelled() => { break 'task_loop; }
      );
      println!("Retrying backup log upload");
    }
    println!("Backup handler task id={task_id} stopped.");
  })
}

async fn watch_and_upload_files(
  backup_client: &BackupClient,
  user_identity: &UserIdentity,
  tx: &mut Pin<Box<impl Sink<UploadLogRequest, Error = BackupError>>>,
  logs_waiting_for_confirmation: &AsyncMutex<HashSet<PathBuf>>,
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

    let mut compaction_ids = HashSet::new();
    let mut logs = Vec::new();

    while let Some(file) = file_stream.next_entry().await? {
      let path = file.path();
      if let Ok(BackupFileInfo {
        backup_id,
        log_id,
        additional_data,
      }) = path.clone().try_into()
      {
        // Skip additional data files (attachments). They will be
        // handled when we iterate over the corresponding files with the
        // main content
        if additional_data.is_some() {
          continue;
        }

        match log_id {
          Some(id) => logs.push((path, backup_id, id)),
          None => {
            compaction_ids.insert(backup_id);
          }
        }
      }
    }

    for backup_id in compaction_ids {
      compaction::upload_files(backup_client, user_identity, backup_id).await?;
    }

    for (path, backup_id, log_id) in logs {
      if logs_waiting_for_confirmation.lock().await.contains(&path) {
        continue;
      }
      log::upload_files(tx, backup_id, log_id).await?;
      logs_waiting_for_confirmation
        .lock()
        .await
        .insert(path.clone());
    }

    TRIGGER_BACKUP_FILE_UPLOAD.notified().await;
  }
}

async fn delete_confirmed_logs(
  rx: &mut Pin<
    Box<impl Stream<Item = Result<LogUploadConfirmation, BackupError>>>,
  >,
  logs_waiting_for_confirmation: &AsyncMutex<HashSet<PathBuf>>,
) -> Result<Infallible, BackupHandlerError> {
  while let Some(LogUploadConfirmation { backup_id, log_id }) =
    rx.next().await.transpose()?
  {
    let path =
      get_backup_log_file_path(&backup_id, &log_id.to_string(), false)?;
    logs_waiting_for_confirmation
      .lock()
      .await
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
    let user_data_path = get_backup_file_path(&backup_id, false, false)?;
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

    let attachments_path = get_backup_file_path(&backup_id, true, false)?;
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

    let db_version_path = get_backup_file_path(&backup_id, false, true)?;
    let db_version = match tokio::fs::read_to_string(&db_version_path).await {
      Ok(data) => data.parse::<u16>().ok(),
      Err(err) if err.kind() == ErrorKind::NotFound => None,
      Err(err) => return Err(err.into()),
    };

    let version_info = backup_client::BackupVersionInfo {
      code_version: crate::generated::CODE_VERSION as u16,
      state_version: crate::generated::STATE_VERSION as u16,
      db_version: db_version.unwrap_or_default(),
    };

    let backup_data = BackupData {
      backup_id: backup_id.clone(),
      user_data,
      user_keys,
      attachments,
      siwe_backup_msg,
      version_info,
    };

    let result = backup_client
      .upload_backup(user_identity, backup_data)
      .await
      .map_err(|e| e.to_string());

    cleanup_files(backup_id.clone()).await;
    compaction_upload_promises::resolve(&backup_id, result);

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
        get_backup_file_path(&backup_id, false, false)?,
        get_backup_file_path(&backup_id, false, true)?,
        get_backup_user_keys_file_path(&backup_id)?,
        get_backup_file_path(&backup_id, true, false)?,
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
