use std::fmt::Display;

use crate::tools::Error;
use comm_services_lib::auth::UserIdentity;

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

impl Display for BackupDescriptor {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      BackupDescriptor::BackupID {
        backup_id,
        user_identity,
      } => write!(
        f,
        "backup '{backup_id}' for user '{}'",
        user_identity.user_id
      ),
      BackupDescriptor::Latest { username } => {
        write!(f, "latest backup for user '{username}'")
      }
    }
  }
}

#[derive(Debug, Clone, Copy)]
pub enum RequestedData {
  BackupID,
  UserKeys,
  UserData,
}

pub async fn run(
  url: reqwest::Url,
  backup_descriptor: BackupDescriptor,
  requested_data: RequestedData,
) -> Result<Vec<u8>, Error> {
  println!("Pulling data: {requested_data:?}, from {backup_descriptor}");

  let client = reqwest::Client::new();
  let url = url.join("backups/")?;
  let url = match &backup_descriptor {
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

  if let BackupDescriptor::BackupID { user_identity, .. } = backup_descriptor {
    request = request.bearer_auth(user_identity.as_authorization_token()?)
  }

  let response = request.send().await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  let result = response.bytes().await?.to_vec();

  Ok(result)
}
