use commtest::identity::device::{
  create_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use grpc_clients::identity::{
  get_auth_client, get_unauthenticated_client,
  protos::{
    authenticated::OutboundKeysForUserRequest, client::UploadOneTimeKeysRequest,
  },
};

#[tokio::test]
async fn set_prekey() {
  let device_info = create_device(None).await;

  let mut client = get_auth_client(
    "http://[::1]:50054",
    device_info.user_id.clone(),
    device_info.device_id.clone(),
    device_info.access_token.clone(),
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = UploadOneTimeKeysRequest {
    user_id: device_info.user_id.clone(),
    device_id: device_info.device_id,
    access_token: device_info.access_token,
    content_one_time_pre_keys: vec!["content1".to_string()],
    notif_one_time_pre_keys: vec!["notif1".to_string()],
  };

  let mut unauthenticated_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

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
    first_reponse.one_time_content_prekey,
    Some("content1".to_string())
  );
  assert_eq!(
    first_reponse.one_time_notif_prekey,
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
  assert_eq!(second_reponse.one_time_content_prekey, None);
  assert_eq!(second_reponse.one_time_notif_prekey, None);
}
