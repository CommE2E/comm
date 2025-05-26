use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account::generate_random_olm_key;
use commtest::service_addr;
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_auth_client, protos::authenticated::OutboundKeysForUserRequest,
  protos::authenticated::UploadOneTimeKeysRequest,
};

#[tokio::test]
async fn upload_one_time_keys() {
  let device_info = register_user_device(None, None).await;

  let mut identity_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id,
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: vec![
      generate_random_olm_key(),
      generate_random_olm_key(),
    ],
    notif_one_time_prekeys: vec![
      generate_random_olm_key(),
      generate_random_olm_key(),
    ],
  };

  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .unwrap();
}

#[tokio::test]
async fn max_hundred_keys_in_ddb() {
  let device_info = register_user_device(None, None).await;

  let mut identity_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id.clone(),
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  // We expect these keys to be removed by the identity service before we
  // retrieve any OTKs
  let first_upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: vec![generate_random_olm_key()],
    notif_one_time_prekeys: vec![generate_random_olm_key()],
  };

  identity_client
    .upload_one_time_keys(first_upload_request)
    .await
    .unwrap();

  let mut expected_first_retrieved_content_key = None;
  let mut expected_first_retrieved_notif_key = None;

  let mut expected_second_retrieved_content_key = None;
  let mut expected_second_retrieved_notif_key = None;

  // Upload 100 content and notif one-time keys in batches of 20 keys
  for request_num in 0..5 {
    let content_keys: Vec<_> =
      (0..20).map(|_| generate_random_olm_key()).collect();
    let notif_keys: Vec<_> =
      (0..20).map(|_| generate_random_olm_key()).collect();

    if request_num == 0 {
      expected_first_retrieved_content_key = content_keys.first().cloned();
      expected_first_retrieved_notif_key = notif_keys.first().cloned();
      expected_second_retrieved_content_key = content_keys.get(5).cloned();
      expected_second_retrieved_notif_key = notif_keys.get(5).cloned();
    }

    let upload_request = UploadOneTimeKeysRequest {
      content_one_time_prekeys: content_keys,
      notif_one_time_prekeys: notif_keys,
    };

    identity_client
      .upload_one_time_keys(upload_request)
      .await
      .unwrap();
  }

  let keyserver_request = OutboundKeysForUserRequest {
    user_id: device_info.user_id,
    selected_devices: Vec::new(),
  };

  let first_keyserver_response = identity_client
    .get_keyserver_keys(keyserver_request.clone())
    .await
    .unwrap()
    .into_inner()
    .keyserver_info
    .unwrap();

  assert!(first_keyserver_response.one_time_content_prekey.is_some());
  assert!(first_keyserver_response.one_time_notif_prekey.is_some());

  assert_eq!(
    expected_first_retrieved_content_key,
    first_keyserver_response.one_time_content_prekey
  );
  assert_eq!(
    expected_first_retrieved_notif_key,
    first_keyserver_response.one_time_notif_prekey
  );

  // Upload 5 more keys for each account
  let content_keys: Vec<_> =
    (0..5).map(|_| generate_random_olm_key()).collect();
  let notif_keys: Vec<_> = (0..5).map(|_| generate_random_olm_key()).collect();

  let final_upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: content_keys,
    notif_one_time_prekeys: notif_keys,
  };

  identity_client
    .upload_one_time_keys(final_upload_request)
    .await
    .unwrap();

  let second_keyserver_response = identity_client
    .get_keyserver_keys(keyserver_request)
    .await
    .unwrap()
    .into_inner()
    .keyserver_info
    .unwrap();

  assert!(second_keyserver_response.one_time_content_prekey.is_some());
  assert!(second_keyserver_response.one_time_notif_prekey.is_some());

  assert_eq!(
    expected_second_retrieved_content_key,
    second_keyserver_response.one_time_content_prekey
  );
  assert_eq!(
    expected_second_retrieved_notif_key,
    second_keyserver_response.one_time_notif_prekey
  );
}

#[tokio::test]
async fn max_24_keys_per_account_per_upload() {
  let device_info = register_user_device(None, None).await;

  let mut identity_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id,
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  // The limit is 24 keys per account per upload, so this should fail
  let content_keys = (0..26).map(|_| generate_random_olm_key()).collect();
  let notif_keys = (0..20).map(|_| generate_random_olm_key()).collect();

  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: content_keys,
    notif_one_time_prekeys: notif_keys,
  };

  assert!(identity_client
    .upload_one_time_keys(upload_request)
    .await
    .is_err());
}
