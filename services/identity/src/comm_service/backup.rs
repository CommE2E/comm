use comm_lib::auth::AuthService;

use crate::{
  config::CONFIG,
  constants::{error_types, tonic_status_messages},
};

pub async fn delete_backup_user_data(
  user_id: &str,
  auth_service: &AuthService,
) -> Result<(), crate::error::Error> {
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

pub async fn user_has_backup(
  user_identifier: &str,
) -> Result<bool, crate::error::Error> {
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
