use super::*;

use identity_client::UploadOneTimeKeysRequest;
use tracing::{debug, error};

#[napi]
#[instrument(skip_all)]
pub async fn upload_one_time_keys(
  user_id: String,
  device_id: String,
  access_token: String,
  content_one_time_pre_keys: Vec<String>,
  notif_one_time_pre_keys: Vec<String>,
) -> bool {
  let channel = match get_identity_service_channel().await {
    Ok(c) => c,
    Err(e) => {
      error!(
        "Error when attempting to connect to identity service: {}",
        e
      );
      return false;
    }
  };

  let mut identity_client = IdentityClientServiceClient::new(channel);

  let upload_request = UploadOneTimeKeysRequest {
    user_id,
    device_id,
    access_token,
    content_one_time_pre_keys,
    notif_one_time_pre_keys,
  };

  debug!("Sending one time keys to identity service");
  let result = identity_client.upload_one_time_keys(upload_request).await;

  result.is_ok()
}
