use super::*;

use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn upload_one_time_keys(
  user_id: String,
  device_id: String,
  access_token: String,
  content_one_time_pre_keys: Vec<String>,
  notif_one_time_pre_keys: Vec<String>,
) -> Result<bool> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client = get_identity_client_service_channel().await?;

  let upload_request = UploadOneTimeKeysRequest {
    user_id,
    device_id,
    access_token,
    content_one_time_pre_keys,
    notif_one_time_pre_keys,
  };

  debug!("Sending one time keys to Identity service");
  let result = identity_client.upload_one_time_keys(upload_request).await;

  Ok(true)
}
