mod client {
  tonic::include_proto!("identity.client");
}
mod auth_proto {
  tonic::include_proto!("identity.authenticated");
}
use client::identity_client_service_client::IdentityClientServiceClient;
use client::UploadOneTimeKeysRequest;
use commtest::identity::device::create_device;

#[tokio::test]
async fn verify_access_token() {
  let device_info = create_device().await;

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054")
      .await
      .expect("Couldn't connect to identity service");

  let upload_request = UploadOneTimeKeysRequest {
    user_id: device_info.user_id,
    device_id: device_info.device_id,
    access_token: device_info.access_token,
    content_one_time_pre_keys: vec![
      "content1".to_string(),
      "content2".to_string(),
    ],
    notif_one_time_pre_keys: vec!["notif1".to_string(), "notif2".to_string()],
  };

  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .unwrap();
}
