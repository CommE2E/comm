use super::get_authenticated_identity_client;
use super::{Error, Status};
use grpc_clients::identity::protos::{
  authenticated::RefreshUserPrekeysRequest, unauthenticated::Prekey,
};
use napi::Result;
use tracing::warn;

#[napi]
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
  let mut client =
    get_authenticated_identity_client(user_id, device_id, access_token).await?;

  let message = RefreshUserPrekeysRequest {
    new_content_prekey: Some(Prekey {
      prekey: content_prekey,
      prekey_signature: content_prekey_signature,
    }),
    new_notif_prekey: Some(Prekey {
      prekey: notif_prekey,
      prekey_signature: notif_prekey_signature,
    }),
  };

  client.refresh_user_prekeys(message).await.map_err(|e| {
    warn!(
      "Failed to upload new prekeys to identity service: {:?}",
      e.message()
    );
    Error::from_status(Status::GenericFailure)
  })?;

  Ok(true)
}
