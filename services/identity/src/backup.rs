use crate::{config::CONFIG, constants::error_types};

pub async fn delete_backup_user_data(
  user_id: &str,
) -> Result<(), crate::error::Error> {
  let path = format!("/user_data/{}", user_id);
  let url = CONFIG
    .backup_service_url
    .join(&path)
    .expect("failed to construct backup service URL");
  let client = reqwest::Client::builder().build()?;
  let response = client.delete(url).send().await?;
  if !response.status().is_success() {
    let response_body = response.text().await?;
    tracing::error!(
      errorType = error_types::HTTP_LOG,
      "Backup service failed to delete user data: {}",
      response_body
    )
  }
  Ok(())
}
