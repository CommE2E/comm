pub use comm_lib::auth::UserIdentity;
pub use comm_lib::backup::{
  DownloadLogsRequest, LatestBackupIDResponse, LogWSRequest, LogWSResponse,
  UploadLogRequest,
};
pub use futures_util::{Sink, SinkExt, Stream, StreamExt, TryStreamExt};

use hex::ToHex;
use reqwest::{
  header::InvalidHeaderValue,
  multipart::{Form, Part},
  Body,
};
use sha2::{Digest, Sha256};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{
  connect_async,
  tungstenite::{
    client::IntoClientRequest,
    http::{header, Request},
    Error as TungsteniteError,
    Message::{Binary, Ping},
  },
};

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
    } = backup_data;

    let client = reqwest::Client::new();
    let form = Form::new()
      .text("backup_id", backup_id)
      .text(
        "user_keys_hash",
        Sha256::digest(&user_keys).encode_hex::<String>(),
      )
      .part("user_keys", Part::stream(Body::from(user_keys)))
      .text(
        "user_data_hash",
        Sha256::digest(&user_data).encode_hex::<String>(),
      )
      .part("user_data", Part::stream(Body::from(user_data)))
      .text("attachments", attachments.join("\n"));

    let response = client
      .post(self.url.join("backups")?)
      .bearer_auth(user_identity.as_authorization_token()?)
      .multipart(form)
      .send()
      .await?;

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
      BackupDescriptor::Latest { username } => {
        url.join(&format!("latest/{username}/"))?
      }
    };
    let url = match &requested_data {
      RequestedData::BackupID => url.join("backup_id")?,
      RequestedData::UserKeys => url.join("user_keys")?,
      RequestedData::UserData => url.join("user_data")?,
    };

    let mut request = client.get(url);

    if let BackupDescriptor::BackupID { user_identity, .. } = backup_descriptor
    {
      request = request.bearer_auth(user_identity.as_authorization_token()?)
    }

    let response = request.send().await?;

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
    let request = self.create_ws_request(user_identity)?;
    let (stream, response) = connect_async(request).await?;

    if response.status().is_client_error() {
      return Err(Error::TungsteniteError(TungsteniteError::Http(response)));
    }

    let (tx, rx) = stream.split();

    let tx = tx.with(|request: UploadLogRequest| async {
      let request = LogWSRequest::UploadLog(request);
      let request = bincode::serialize(&request)?;
      Ok(Binary(request))
    });

    let rx = rx.filter_map(|msg| async {
      let response = match get_log_ws_response(msg) {
        Some(Ok(response)) => response,
        Some(Err(err)) => return Some(Err(err)),
        None => return None,
      };

      match response {
        LogWSResponse::LogUploaded { backup_id, log_id } => {
          Some(Ok(LogUploadConfirmation { backup_id, log_id }))
        }
        LogWSResponse::LogDownload { .. }
        | LogWSResponse::LogDownloadFinished { .. } => {
          Some(Err(Error::InvalidBackupMessage))
        }
        LogWSResponse::ServerError => Some(Err(Error::ServerError)),
      }
    });

    Ok((tx, rx))
  }

  pub async fn download_logs(
    &self,
    user_identity: &UserIdentity,
  ) -> Result<
    (
      impl Sink<DownloadLogsRequest, Error = Error>,
      impl Stream<Item = Result<LogWSResponse, Error>>,
    ),
    Error,
  > {
    let request = self.create_ws_request(user_identity)?;
    let (stream, response) = connect_async(request).await?;

    if response.status().is_client_error() {
      return Err(Error::TungsteniteError(TungsteniteError::Http(response)));
    }

    let (tx, rx) = stream.split();

    let tx = tx.with(|request: DownloadLogsRequest| async {
      let request = LogWSRequest::DownloadLogs(request);
      let request = bincode::serialize(&request)?;
      Ok(Binary(request))
    });

    let rx = rx.filter_map(|msg| async {
      let response = match get_log_ws_response(msg) {
        Some(Ok(response)) => response,
        Some(Err(err)) => return Some(Err(err)),
        None => return None,
      };

      match response {
        LogWSResponse::LogDownloadFinished { .. }
        | LogWSResponse::LogDownload { .. } => Some(Ok(response)),
        LogWSResponse::LogUploaded { .. } => {
          Some(Err(Error::InvalidBackupMessage))
        }
        LogWSResponse::ServerError => Some(Err(Error::ServerError)),
      }
    });

    Ok((tx, rx))
  }

  fn create_ws_request(
    &self,
    user_identity: &UserIdentity,
  ) -> Result<Request<()>, Error> {
    let mut url = self.url.clone();

    match url.scheme() {
      "http" => url.set_scheme("ws").map_err(|_| Error::UrlSchemaError)?,
      "https" => url.set_scheme("wss").map_err(|_| Error::UrlSchemaError)?,
      _ => (),
    };
    let url = url.join("logs")?;

    let mut request = url.into_client_request().unwrap();

    let token = user_identity.as_authorization_token()?;
    request
      .headers_mut()
      .insert(header::AUTHORIZATION, format!("Bearer {token}").parse()?);

    Ok(request)
  }
}

#[derive(Debug, Clone)]
pub struct BackupData {
  pub backup_id: String,
  pub user_keys: Vec<u8>,
  pub user_data: Vec<u8>,
  pub attachments: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum BackupDescriptor {
  BackupID {
    backup_id: String,
    user_identity: UserIdentity,
  },
  Latest {
    username: String,
  },
}

#[derive(Debug, Clone, Copy)]
pub enum RequestedData {
  BackupID,
  UserKeys,
  UserData,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct LogUploadConfirmation {
  pub backup_id: String,
  pub log_id: usize,
}

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
  InvalidAuthorizationHeader,
  UrlSchemaError,
  UrlError(url::ParseError),
  ReqwestError(reqwest::Error),
  TungsteniteError(TungsteniteError),
  JsonError(serde_json::Error),
  BincodeError(bincode::Error),
  InvalidWSMessage,
  InvalidBackupMessage,
  ServerError,
}

impl From<InvalidHeaderValue> for Error {
  fn from(_: InvalidHeaderValue) -> Self {
    Self::InvalidAuthorizationHeader
  }
}

fn get_log_ws_response(
  msg: Result<Message, TungsteniteError>,
) -> Option<Result<LogWSResponse, Error>> {
  let bytes = match msg {
    Ok(Binary(bytes)) => bytes,
    // Handled by tungstenite
    Ok(Ping(_)) => return None,
    Ok(_) => return Some(Err(Error::InvalidWSMessage)),
    Err(err) => return Some(Err(err.into())),
  };

  match bincode::deserialize(&bytes) {
    Ok(response) => Some(Ok(response)),
    Err(err) => Some(Err(err.into())),
  }
}
