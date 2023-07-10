mod proto {
  tonic::include_proto!("identity.client");
}
use proto as client;
mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use auth_proto::RefreshUserPreKeysRequest;
use client::PreKey;
use commtest::identity::device::create_device;
use tonic::{transport::Endpoint, Request};

#[tokio::test]
async fn set_prekey() {
  let device_info = create_device().await;

  let channel = Endpoint::from_static("http://[::1]:50054")
    .connect()
    .await
    .unwrap();

  let mut client =
    AuthClient::with_interceptor(channel, |mut request: Request<()>| {
      let metadata = request.metadata_mut();
      metadata.append("user_id", device_info.user_id.parse().unwrap());
      metadata.append("device_id", device_info.device_id.parse().unwrap());
      metadata
        .append("access_token", device_info.access_token.parse().unwrap());
      Ok(request)
    });

  let upload_request = RefreshUserPreKeysRequest {
    new_content_pre_keys: Some(PreKey {
      pre_key: "content_prekey".to_string(),
      pre_key_signature: "content_prekey_signature".to_string(),
    }),
    new_notif_pre_keys: Some(PreKey {
      pre_key: "content_prekey".to_string(),
      pre_key_signature: "content_prekey_signature".to_string(),
    }),
  };

  // This send will fail if the one-time keys weren't successfully added
  println!(
    "Error: {:?}",
    client.refresh_user_pre_keys(upload_request).await
  );
}
