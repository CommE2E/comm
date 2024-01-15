use super::get_user_identity_from_secure_store;
use crate::constants::BACKUP_SERVICE_CONNECTION_RETRY_DELAY;
use crate::BACKUP_SOCKET_ADDR;
use crate::RUNTIME;
use backup_client::{
  BackupClient, Error as BackupError, LogUploadConfirmation, Stream, StreamExt,
  WSError,
};
use lazy_static::lazy_static;
use std::convert::Infallible;
use std::error::Error;
use std::future::{self, Future};
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;

lazy_static! {
  pub static ref UPLOAD_HANDLER: Arc<Mutex<Option<JoinHandle<Infallible>>>> =
    Arc::new(Mutex::new(None));
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

      let mut _tx = Box::pin(tx);
      let mut rx = Box::pin(rx);

      let err = tokio::select! {
        Err(err) = watch_and_upload_files() => err,
        Err(err) = delete_confirmed_logs(&mut rx) => err,
      };

      println!("Backup handler error: '{err:?}'");

      tokio::time::sleep(BACKUP_SERVICE_CONNECTION_RETRY_DELAY).await;
      println!("Retrying backup log upload");
    }
  })
}

async fn watch_and_upload_files() -> Result<Infallible, BackupHandlerError> {
  loop {
    let () = future::pending().await;
  }
}

async fn delete_confirmed_logs(
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
