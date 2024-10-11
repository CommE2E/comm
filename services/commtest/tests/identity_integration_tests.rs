use std::time::Duration;

use bytesize::ByteSize;
use comm_lib::tools::base64_to_base64url;
use commtest::blob::blob_utils::{BlobData, BlobServiceClient};
use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account::generate_random_olm_key;
use commtest::service_addr;
use grpc_clients::identity::protos::unauth::Empty;
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_auth_client, get_unauthenticated_client,
  protos::auth::{Identity, UserIdentitiesRequest},
  protos::unauthenticated::{
    find_user_id_request::Identifier, FindUserIdRequest,
  },
};

#[tokio::test]
async fn find_user_id_by_username() {
  let device_info = register_user_device(None, None).await;

  let mut client = get_unauthenticated_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let request = FindUserIdRequest {
    identifier: Some(Identifier::Username(device_info.username)),
  };

  let response = client
    .find_user_id(request)
    .await
    .expect("Request failed")
    .into_inner();

  assert_eq!(
    response.user_id,
    Some(device_info.user_id),
    "User ID should match"
  );
}

#[tokio::test]
async fn find_username_for_user() {
  let device_info = register_user_device(None, None).await;

  let mut client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    device_info.user_id.clone(),
    device_info.device_id,
    device_info.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let request = UserIdentitiesRequest {
    user_ids: vec![device_info.user_id.clone()],
  };
  let response = client
    .find_user_identities(request)
    .await
    .expect("request failed")
    .into_inner();

  let expected_username = device_info.username;
  assert!(
    matches!(
      response.identities.get(&device_info.user_id),
      Some(Identity {
        username, ..
      }) if *username == expected_username
    ),
    "username doesn't match"
  );
}

#[tokio::test]
async fn test_removing_blob_holders_on_logout() {
  let blob_url = reqwest::Url::try_from(service_addr::BLOB_SERVICE_HTTP)
    .expect("failed to parse blob service url");
  let blob_client = BlobServiceClient::new(blob_url);

  // Register user device
  let user = register_user_device(None, None).await;
  let mut user_identity_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    user.user_id,
    user.device_id.clone(),
    user.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  // 1. Upload a blob with holder belonging to the device
  let blob_data = BlobData {
    // holder is prefixed with device ID in base64url format
    holder: format!("{}:holder1", base64_to_base64url(&user.device_id)),
    hash: format!("blob_{}", generate_random_olm_key()),
    chunks_sizes: vec![ByteSize::b(100).as_u64() as usize],
  };
  let first_upload = commtest::blob::put::run(&blob_client, &blob_data)
    .await
    .expect("Failed to upload blob");
  assert!(
    !first_upload.holder_already_exists(),
    "Holder should not exist yet"
  );

  // 2. Check if assigned holder exists
  let upload_before_logout = commtest::blob::put::run(&blob_client, &blob_data)
    .await
    .expect("Failed to check if holder exists (before logout)");
  assert!(
    upload_before_logout.holder_already_exists(),
    "Holder should exist now"
  );

  // 3. Log out device
  user_identity_client
    .log_out_user(Empty {})
    .await
    .expect("Failed to log out user");

  // identity runs holder removal asynchronously so wait a bit
  tokio::time::sleep(Duration::from_millis(500)).await;

  // 4. Check if assigned holder doesn't exist now
  let upload_after_logout = commtest::blob::put::run(&blob_client, &blob_data)
    .await
    .expect("Failed to check if holder exists (after logout)");
  assert!(
    !upload_after_logout.holder_already_exists(),
    "Holder should be removed now"
  );
}
