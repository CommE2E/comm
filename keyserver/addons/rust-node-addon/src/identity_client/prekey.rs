pub mod client {
  tonic::include_proto!("identity.client");
}
mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use super::{Error, Status, IDENTITY_SERVICE_CONFIG};
use auth_proto::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use auth_proto::RefreshUserPreKeysRequest;
use client::PreKey;
use napi::Result;
use tonic::{transport::Endpoint, Request};
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
  let channel =
    Endpoint::from_static(&IDENTITY_SERVICE_CONFIG.identity_socket_addr)
      .connect()
      .await
      .unwrap();

  // Once this rust addon can do getCommConfig, remove explicit passing of user
  // credentials within this scope
  let mut client =
    AuthClient::with_interceptor(channel, |mut request: Request<()>| {
      let metadata = request.metadata_mut();
      metadata.append("user_id", user_id.parse().unwrap());
      metadata.append("device_id", device_id.parse().unwrap());
      metadata.append("access_token", access_token.parse().unwrap());
      Ok(request)
    });

  let upload_request = RefreshUserPreKeysRequest {
    new_content_pre_keys: Some(PreKey {
      pre_key: content_prekey,
      pre_key_signature: content_prekey_signature,
    }),
    new_notif_pre_keys: Some(PreKey {
      pre_key: notif_prekey,
      pre_key_signature: notif_prekey_signature,
    }),
  };

  client
    .refresh_user_pre_keys(upload_request)
    .await
    .map_err(|e| {
      warn!(
        "Failed to upload new prekeys to identity service: {:?}",
        e.message()
      );
      Error::from_status(Status::GenericFailure)
    })?;

  Ok(true)
}
