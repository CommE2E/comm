use std::convert::Infallible;

use crate::tools::Error;
use async_stream::stream;
use comm_services_lib::auth::UserIdentity;
use reqwest::{
  multipart::{Form, Part},
  Body,
};

use super::backup_utils::BackupData;

pub async fn run(
  url: reqwest::Url,
  user_identity: &UserIdentity,
  backup_data: &BackupData,
) -> Result<(), Error> {
  println!("Creating new backup");

  let BackupData {
    backup_id,
    user_keys_hash,
    user_keys,
    user_data_hash,
    user_data,
    attachments,
  } = backup_data.clone();

  let client = reqwest::Client::new();
  let form = Form::new()
    .text("backup_id", backup_id)
    .text("user_keys_hash", user_keys_hash)
    .part(
      "user_keys",
      Part::stream(Body::wrap_stream(
        stream! { yield Ok::<Vec<u8>, Infallible>(user_keys);  },
      )),
    )
    .text("user_data_hash", user_data_hash)
    .part(
      "user_data",
      Part::stream(Body::wrap_stream(
        stream! { yield Ok::<Vec<u8>, Infallible>(user_data);  },
      )),
    )
    .text("attachments", attachments.join("\n"));

  let response = client
    .post(url.join("backups")?)
    .bearer_auth(user_identity.as_authorization_token()?)
    .multipart(form)
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(Error::HttpStatus(response.status()));
  }

  Ok(())
}
