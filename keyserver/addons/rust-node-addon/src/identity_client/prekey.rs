use super::auth_client::{
  auth_proto::RefreshUserPreKeysRequest, client::PreKey, get_auth_client,
};
use super::{Error, Status};
use napi::Result;
use tracing::warn;

pub async fn publish_prekeys(
  user_id: String,
  device_id: String,
  access_token: String,
  content_prekey: String,
  content_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
) -> Result<bool> {
  // Once this rust addon can do getCommConfig, remove explicit passing of user
  // credentials within this scope
  let mut client = get_auth_client(user_id, device_id, access_token).await;

  let message = RefreshUserPreKeysRequest {
    new_content_pre_keys: Some(PreKey {
      pre_key: content_prekey,
      pre_key_signature: content_prekey_signature,
    }),
    new_notif_pre_keys: Some(PreKey {
      pre_key: notif_prekey,
      pre_key_signature: notif_prekey_signature,
    }),
  };

  client.refresh_user_pre_keys(message).await.map_err(|e| {
    warn!(
      "Failed to upload new prekeys to identity service: {:?}",
      e.message()
    );
    Error::from_status(Status::GenericFailure)
  })?;

  Ok(true)
}
