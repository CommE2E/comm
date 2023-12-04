pub use comm_lib::auth::UserIdentity;
pub use comm_lib::backup::LatestBackupIDResponse;
use hex::ToHex;
use reqwest::{
  multipart::{Form, Part},
  Body,
};
use sha2::{Digest, Sha256};

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
      .text("attachments", attachments.join(ATTACHMENT_SEPERATOR));

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

const ATTACHMENT_SEPERATOR: &str = "\n";

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

#[derive(
  Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
  UrlError(url::ParseError),
  ReqwestError(reqwest::Error),
  JsonError(serde_json::Error),
}
