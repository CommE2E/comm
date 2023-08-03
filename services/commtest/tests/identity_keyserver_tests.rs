mod proto {
  tonic::include_proto!("identity.client");
}
use proto as client;
mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use auth_proto::identity_client_service_client::IdentityClientServiceClient as AuthClient;
use auth_proto::OutboundKeysForUserRequest;
use client::UploadOneTimeKeysRequest;
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
      metadata.insert("user_id", device_info.user_id.parse().unwrap());
      metadata.insert("device_id", device_info.device_id.parse().unwrap());
      metadata
        .insert("access_token", device_info.access_token.parse().unwrap());
      Ok(request)
    });

  let upload_request = UploadOneTimeKeysRequest {
    user_id: device_info.user_id.to_string(),
    device_id: device_info.device_id.to_string(),
    access_token: device_info.access_token.to_string(),
    content_one_time_pre_keys: vec!["content1".to_string()],
    notif_one_time_pre_keys: vec!["notif1".to_string()],
  };

  let mut unauthenticated_client =
    proto::identity_client_service_client::IdentityClientServiceClient::connect("http://127.0.0.1:50054")
      .await
      .expect("Couldn't connect to identitiy service");

  unauthenticated_client
    .upload_one_time_keys(upload_request)
    .await
    .expect("Failed to upload keys");

  // Currently allowed to request your own outbound keys
  let keyserver_request = OutboundKeysForUserRequest {
    user_id: device_info.user_id.clone(),
  };

  println!("Getting keyserver info for user, {}", device_info.user_id);
  let first_reponse = client
    .get_keyserver_keys(keyserver_request.clone())
    .await
    .expect("Second keyserver keys request failed")
    .into_inner()
    .keyserver_info
    .unwrap();

  assert_eq!(
    first_reponse.onetime_content_prekey,
    Some("content1".to_string())
  );
  assert_eq!(
    first_reponse.onetime_notif_prekey,
    Some("notif1".to_string())
  );

  let second_reponse = client
    .get_keyserver_keys(keyserver_request)
    .await
    .expect("Second keyserver keys request failed")
    .into_inner()
    .keyserver_info
    .unwrap();

  // The one time keys should be exhausted
  assert_eq!(second_reponse.onetime_content_prekey, None);
  assert_eq!(second_reponse.onetime_notif_prekey, None);
}
