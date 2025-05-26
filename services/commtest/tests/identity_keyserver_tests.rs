use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account::generate_random_olm_key;
use commtest::service_addr;
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_auth_client,
  protos::authenticated::{
    OutboundKeysForUserRequest, UploadOneTimeKeysRequest,
  },
};

#[tokio::test]
async fn set_prekey() {
  let identity_grpc_endpoint = service_addr::IDENTITY_GRPC.to_string();
  let device_info = register_user_device(None, None).await;

  let mut client = get_auth_client(
    &identity_grpc_endpoint,
    device_info.user_id.clone(),
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let content_one_time_prekey = generate_random_olm_key();
  let notif_one_time_prekey = generate_random_olm_key();

  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: vec![content_one_time_prekey.clone()],
    notif_one_time_prekeys: vec![notif_one_time_prekey.clone()],
  };

  client
    .upload_one_time_keys(upload_request)
    .await
    .expect("Failed to upload keys");

  // Currently allowed to request your own outbound keys
  let keyserver_request = OutboundKeysForUserRequest {
    user_id: device_info.user_id.clone(),
    selected_devices: Vec::new(),
  };

  println!("Getting keyserver info for user, {}", device_info.user_id);
  let first_reponse = client
    .get_keyserver_keys(keyserver_request.clone())
    .await
    .expect("First keyserver keys request failed")
    .into_inner()
    .keyserver_info
    .unwrap();

  assert_eq!(
    first_reponse.one_time_content_prekey,
    Some(content_one_time_prekey)
  );
  assert_eq!(
    first_reponse.one_time_notif_prekey,
    Some(notif_one_time_prekey)
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
