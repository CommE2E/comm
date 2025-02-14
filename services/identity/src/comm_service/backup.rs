use comm_lib::{auth::AuthService, backup::database::BackupItem};
use hex::ToHex;
use reqwest::multipart::Part;
use sha2::{Digest, Sha256};
use tracing::debug;

use crate::{
  config::CONFIG,
  constants::{error_types, tonic_status_messages},
  log::redact_sensitive_data,
};

#[tracing::instrument(skip_all)]
pub async fn delete_backup_user_data(
  user_id: &str,
  auth_service: &AuthService,
) -> Result<(), crate::error::Error> {
  debug!(
    user_id = redact_sensitive_data(user_id),
    "Attempting to remove user backups."
  );

  let path = format!("/user_data/{}", user_id);
  let url = CONFIG
    .backup_service_url
    .join(&path)
    .expect("failed to construct backup service URL");
  let services_token =
    auth_service.get_services_token().await.map_err(|err| {
      tracing::error!(
        errorType = error_types::HTTP_LOG,
        "Failed to retrieve service-to-service token: {err:?}",
      );
      tonic::Status::aborted(tonic_status_messages::UNEXPECTED_ERROR)
    })?;

  let client = reqwest::Client::builder().build()?;
  let response = client
    .delete(url)
    .bearer_auth(services_token.as_authorization_token()?)
    .send()
    .await?;
  if !response.status().is_success() {
    let response_status = response.status();
    let response_body = response
      .text()
      .await
      .unwrap_or("[failed to get response text]".to_string());
    tracing::error!(
      errorType = error_types::HTTP_LOG,
      "Backup service failed to delete user data: {} - {}",
      response_status,
      response_body,
    )
  }
  Ok(())
}

#[tracing::instrument(skip_all)]
pub async fn user_has_backup(
  user_identifier: &str,
) -> Result<bool, crate::error::Error> {
  debug!(
    user_identifier = redact_sensitive_data(user_identifier),
    "Attempting to check if user has backup."
  );

  let path = format!("/backups/latest/{user_identifier}/backup_info");
  let url = CONFIG
    .backup_service_url
    .join(&path)
    .expect("failed to construct backup service URL");

  let client = reqwest::Client::builder().build()?;
  let response = client.get(url).send().await?;

  use http::StatusCode;
  match response.status() {
    StatusCode::OK => Ok(true), // Backup service returned backup info
    StatusCode::NOT_FOUND => Ok(false), // Backup service returned BackupError::NoBackup
    StatusCode::BAD_REQUEST => {
      // Identity has no user with given UserIdentifier
      Err(crate::error::Error::MissingItem)
    }
    response_status => {
      let response_body = response
        .text()
        .await
        .unwrap_or("[failed to get response text]".to_string());
      tracing::error!(
        errorType = error_types::HTTP_LOG,
        "Backup service failed to get latest backup info: {} - {}",
        response_status,
        response_body,
      );
      Err(
        tonic::Status::aborted(tonic_status_messages::UNEXPECTED_ERROR).into(),
      )
    }
  }
}

#[tracing::instrument(skip_all)]
pub async fn prepare_user_keys(
  auth_service: &AuthService,
  user_id: &str,
  backup_id: &str,
  user_keys: Vec<u8>,
  siwe_backup_msg: Option<String>,
) -> Result<BackupItem, crate::error::Error> {
  debug!(
    user_id = redact_sensitive_data(user_id),
    "Attempting to prepare UserKeys backup."
  );

  let path = "/utils/prepare_user_keys";
  let url = CONFIG
    .backup_service_url
    .join(path)
    .expect("failed to construct backup service URL");

  let services_token = auth_service
    .get_services_token()
    .await
    .map_err(|err| {
      tracing::error!(
        errorType = error_types::HTTP_LOG,
        "Failed to retrieve service-to-service token: {err:?}",
      );
      tonic::Status::aborted(tonic_status_messages::UNEXPECTED_ERROR)
    })?
    .as_authorization_token()?;

  let client = reqwest::Client::builder().build()?;
  let mut form = reqwest::multipart::Form::new()
    .text("user_id", user_id.to_string())
    .text("backup_id", backup_id.to_string())
    .text(
      "user_keys_hash",
      Sha256::digest(&user_keys).encode_hex::<String>(),
    )
    .part("user_keys", Part::bytes(user_keys));

  if let Some(siwe_backup_msg_value) = siwe_backup_msg {
    form = form.text("siwe_backup_msg", siwe_backup_msg_value);
  }

  let response = client
    .post(url)
    .bearer_auth(services_token)
    .multipart(form)
    .send()
    .await?;

  if let Err(err) = response.error_for_status_ref() {
    let response_status = response.status();
    let response_body = response
      .text()
      .await
      .unwrap_or("[failed to get response text]".to_string());
    tracing::error!(
      errorType = error_types::HTTP_LOG,
      "Backup service failed to prepare user keys: {} - {}",
      response_status,
      response_body,
    );

    return Err(err.into());
  }

  let backup_item: BackupItem = response.json().await?;

  Ok(backup_item)
}
