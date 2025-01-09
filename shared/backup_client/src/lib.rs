#[cfg(target_arch = "wasm32")]
mod web;

use async_stream::{stream, try_stream};
pub use comm_lib::auth::UserIdentity;
pub use comm_lib::backup::{
  DownloadLogsRequest, LatestBackupInfoResponse, LogWSRequest, LogWSResponse,
  UploadLogRequest,
};
pub use futures_util::{Sink, SinkExt, Stream, StreamExt, TryStreamExt};
use hex::ToHex;
use reqwest::{
  header::InvalidHeaderValue,
  multipart::{Form, Part},
  Body, StatusCode,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tokio_tungstenite_wasm::{
  connect, Error as TungsteniteError, Message::Binary,
};

const LOG_DOWNLOAD_RETRY_DELAY: Duration = Duration::from_secs(5);
const LOG_DOWNLOAD_MAX_RETRY: usize = 3;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::wasm_bindgen;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone)]
pub struct BackupClient {
  url: reqwest::Url,
}

impl BackupClient {
  pub fn new<T: TryInto<reqwest::Url>>(url: T) -> Result<Self, T::Error> {
    Ok(BackupClient {
      url: url.try_into()?,
    })
  }
}

/// Backup functions
impl BackupClient {
  pub async fn upload_backup(
    &self,
    user_identity: &UserIdentity,
    backup_data: BackupData,
  ) -> Result<(), Error> {
    let BackupData {
      backup_id,
      user_keys,
      user_data,
      attachments,
      siwe_backup_msg,
    } = backup_data;

    let endpoint = match (user_data.clone(), user_keys.clone()) {
      (None, None) => return Err(Error::InvalidRequest),
      (Some(_), Some(_)) => "backups",
      (Some(_), None) => "backups/user_data",
      (None, Some(_)) => "backups/user_keys",
    };

    let client = reqwest::Client::new();
    let mut form = Form::new().text("backup_id", backup_id);

    if let Some(user_keys_value) = user_keys.clone() {
      form = form
        .text(
          "user_keys_hash",
          Sha256::digest(&user_keys_value).encode_hex::<String>(),
        )
        .part("user_keys", Part::stream(Body::from(user_keys_value)));
    }

    if let Some(user_data_value) = user_data.clone() {
      form = form
        .text(
          "user_data_hash",
          Sha256::digest(&user_data_value).encode_hex::<String>(),
        )
        .part("user_data", Part::stream(Body::from(user_data_value)))
        .text("attachments", attachments.join("\n"));
    }

    if let Some(siwe_backup_msg_value) = siwe_backup_msg {
      form = form.text("siwe_backup_msg", siwe_backup_msg_value);
    }

    let response = client
      .post(self.url.join(endpoint)?)
      .bearer_auth(user_identity.as_authorization_token()?)
      .multipart(form)
      .send()
      .await?;

    if matches!(
      response.status(),
      StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN
    ) {
      return Err(Error::Unauthenticated);
    }

    response.error_for_status()?;

    Ok(())
  }

  pub async fn download_backup_data(
    &self,
    backup_descriptor: &BackupDescriptor,
    requested_data: RequestedData,
  ) -> Result<Vec<u8>, Error> {
    let client = reqwest::Client::new();
    let url = self.url.join("backups/")?;
    let url = match backup_descriptor {
      BackupDescriptor::BackupID { backup_id, .. } => {
        url.join(&format!("{backup_id}/"))?
      }
      BackupDescriptor::Latest { user_identifier } => {
        url.join(&format!("latest/{user_identifier}/"))?
      }
    };
    let url = match &requested_data {
      RequestedData::BackupInfo => url.join("backup_info")?,
      RequestedData::UserKeys => url.join("user_keys")?,
      RequestedData::UserData => url.join("user_data")?,
    };

    let mut request = client.get(url);

    if let BackupDescriptor::BackupID { user_identity, .. } = backup_descriptor
    {
      request = request.bearer_auth(user_identity.as_authorization_token()?)
    }

    let response = request.send().await?;

    // this should be kept in sync with HTTP error conversions
    // from `services/backup/src/error.rs`
    match response.status() {
      StatusCode::NOT_FOUND => return Err(Error::BackupNotFound),
      StatusCode::BAD_REQUEST => return Err(Error::UserNotFound),
      _ => (),
    };

    let result = response.error_for_status()?.bytes().await?.to_vec();
    Ok(result)
  }
}

/// Log functions
impl BackupClient {
  pub async fn upload_logs(
    &self,
    user_identity: &UserIdentity,
  ) -> Result<
    (
      impl Sink<UploadLogRequest, Error = Error>,
      impl Stream<Item = Result<LogUploadConfirmation, Error>>,
    ),
    Error,
  > {
    let (tx, rx) = self.create_log_ws_connection(user_identity).await?;

    let rx = rx.map(|response| match response? {
      LogWSResponse::LogUploaded { backup_id, log_id } => {
        Ok(LogUploadConfirmation { backup_id, log_id })
      }
      LogWSResponse::ServerError => Err(Error::ServerError),
      msg => Err(Error::InvalidBackupMessage(msg)),
    });

    Ok((tx, rx))
  }

  /// Handles complete log download.
  /// It will try and retry download a few times, but if the issues persist
  /// the next item returned will be the last received error and the stream
  /// will be closed.
  pub async fn download_logs<'this>(
    &'this self,
    user_identity: &'this UserIdentity,
    backup_id: &'this str,
  ) -> impl Stream<Item = Result<DownloadedLog, Error>> + 'this {
    stream! {
      let mut last_downloaded_log = None;
      let mut fail_count = 0;

      'retry: loop {
        let stream = self.log_download_stream(user_identity, backup_id, &mut last_downloaded_log).await;
        let mut stream = Box::pin(stream);

        while let Some(item) = stream.next().await {
          match item {
            Ok(log) => yield Ok(log),
            Err(err) => {
              println!("Error when downloading logs: {err:?}");

              fail_count += 1;
              if fail_count >= LOG_DOWNLOAD_MAX_RETRY {
                yield Err(err);
                break 'retry;
              }

              #[cfg(target_arch = "wasm32")]
              let _ = web::sleep(LOG_DOWNLOAD_RETRY_DELAY).await;
              #[cfg(not(target_arch = "wasm32"))]
              tokio::time::sleep(LOG_DOWNLOAD_RETRY_DELAY).await;
              continue 'retry;
            }
          }
        }

        // Everything downloaded
        return;
      }

      println!("Log download failed!");
    }
  }

  /// Handles singular connection websocket connection. Returns error in case
  /// anything goes wrong e.g. missing log or connection error.
  async fn log_download_stream<'stream>(
    &'stream self,
    user_identity: &'stream UserIdentity,
    backup_id: &'stream str,
    last_downloaded_log: &'stream mut Option<usize>,
  ) -> impl Stream<Item = Result<DownloadedLog, Error>> + 'stream {
    try_stream! {
      let (mut tx, mut rx) = self.create_log_ws_connection(user_identity).await?;

      tx.send(DownloadLogsRequest {
        backup_id: backup_id.to_string(),
        from_id: *last_downloaded_log,
      })
      .await?;

      while let Some(response) = rx.try_next().await? {
        let expected_log_id = last_downloaded_log.unwrap_or(0);
        match response {
          LogWSResponse::LogDownload {
            content,
            attachments,
            log_id,
          } if log_id == expected_log_id + 1 => {
            *last_downloaded_log = Some(log_id);
            yield DownloadedLog {
              content,
              attachments,
            };
          }
          LogWSResponse::LogDownload { .. } => {
            Err(Error::LogMissing)?;
          }
          LogWSResponse::LogDownloadFinished {
            last_log_id: Some(log_id),
          } if log_id == expected_log_id => {
            tx.send(DownloadLogsRequest {
              backup_id: backup_id.to_string(),
              from_id: *last_downloaded_log,
            })
            .await?
          }
          LogWSResponse::LogDownloadFinished { last_log_id: None } => return,
          LogWSResponse::LogDownloadFinished { .. } => {
            Err(Error::LogMissing)?;
          }
          msg => Err(Error::InvalidBackupMessage(msg))?,
        }
      }

      Err(Error::WSClosed)?;
    }
  }

  async fn create_log_ws_connection<Request: Into<LogWSRequest>>(
    &self,
    user_identity: &UserIdentity,
  ) -> Result<
    (
      impl Sink<Request, Error = Error>,
      impl Stream<Item = Result<LogWSResponse, Error>>,
    ),
    Error,
  > {
    let url = self.create_ws_url()?;
    let stream = connect(url).await?;

    let (mut tx, rx) = stream.split();

    tx.send(Binary(bincode::serialize(&LogWSRequest::Authenticate(
      user_identity.clone(),
    ))?))
    .await?;

    let tx = tx.with(|request: Request| async {
      let request: LogWSRequest = request.into();
      let request = bincode::serialize(&request)?;
      Ok(Binary(request))
    });

    let rx = rx.filter_map(|msg| async {
      let bytes = match msg {
        Ok(Binary(bytes)) => bytes,
        Ok(_) => return Some(Err(Error::InvalidWSMessage)),
        Err(err) => return Some(Err(err.into())),
      };

      match bincode::deserialize(&bytes) {
        Ok(response) => Some(Ok(response)),
        Err(err) => Some(Err(err.into())),
      }
    });

    let tx = Box::pin(tx);
    let mut rx = Box::pin(rx);

    if let Some(response) = rx.try_next().await? {
      match response {
        LogWSResponse::AuthSuccess => {}
        LogWSResponse::Unauthenticated => Err(Error::Unauthenticated)?,
        msg => Err(Error::InvalidBackupMessage(msg))?,
      }
    }

    Ok((tx, rx))
  }

  fn create_ws_url(&self) -> Result<reqwest::Url, Error> {
    let mut url = self.url.clone();

    match url.scheme() {
      "http" => url.set_scheme("ws").map_err(|_| Error::UrlSchemaError)?,
      "https" => url.set_scheme("wss").map_err(|_| Error::UrlSchemaError)?,
      _ => (),
    };
    let url = url.join("logs")?;

    Ok(url)
  }
}

#[derive(Debug, Clone)]
pub struct BackupData {
  pub backup_id: String,
  pub user_keys: Option<Vec<u8>>,
  pub user_data: Option<Vec<u8>>,
  pub attachments: Vec<String>,
  pub siwe_backup_msg: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BackupDescriptor {
  BackupID {
    #[serde(rename = "backupID")]
    backup_id: String,
    #[serde(rename = "userIdentity")]
    user_identity: UserIdentity,
  },
  Latest {
    user_identifier: String,
  },
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, Clone)]
pub enum RequestedData {
  BackupInfo,
  UserKeys,
  UserData,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct LogUploadConfirmation {
  pub backup_id: String,
  pub log_id: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DownloadedLog {
  pub content: Vec<u8>,
  pub attachments: Option<Vec<String>>,
}

#[derive(Debug, derive_more::Display, derive_more::From)]
pub enum Error {
  InvalidAuthorizationHeader,
  UrlSchemaError,
  UrlError(url::ParseError),
  ReqwestError(reqwest::Error),
  TungsteniteError(TungsteniteError),
  JsonError(serde_json::Error),
  BincodeError(bincode::Error),
  InvalidWSMessage,
  #[display(fmt = "Error::InvalidBackupMessage({:?})", _0)]
  InvalidBackupMessage(LogWSResponse),
  ServerError,
  LogMissing,
  WSClosed,
  Unauthenticated,
  InvalidRequest,
  #[display(fmt = "user_not_found")]
  UserNotFound,
  BackupNotFound,
}

impl std::error::Error for Error {}

impl From<InvalidHeaderValue> for Error {
  fn from(_: InvalidHeaderValue) -> Self {
    Self::InvalidAuthorizationHeader
  }
}
