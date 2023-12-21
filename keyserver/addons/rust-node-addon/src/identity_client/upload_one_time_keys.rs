use super::*;

use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn upload_one_time_keys(
  user_id: String,
  device_id: String,
  access_token: String,
  content_one_time_prekeys: Vec<String>,
  notif_one_time_prekeys: Vec<String>,
) -> Result<bool> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client =
    get_authenticated_identity_client(user_id, device_id, access_token).await?;

  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys,
    notif_one_time_prekeys,
  };

  debug!("Sending one time keys to Identity service");
  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .map_err(handle_grpc_error)?;

  Ok(true)
}
