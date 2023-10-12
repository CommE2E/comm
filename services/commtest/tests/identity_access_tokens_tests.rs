use commtest::identity::device::{
  create_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::client::{UploadOneTimeKeysRequest, VerifyUserAccessTokenRequest},
};

#[tokio::test]
async fn verify_access_token() {
  let device_info = create_device(None).await;

  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let verify_request = VerifyUserAccessTokenRequest {
    user_id: device_info.user_id,
    signing_public_key: device_info.device_id,
    access_token: device_info.access_token,
  };

  let response = identity_client
    .verify_user_access_token(verify_request)
    .await
    .unwrap();

  assert_eq!(response.into_inner().token_valid, true);
}

#[tokio::test]
async fn upload_one_time_keys() {
  let device_info = create_device(None).await;

  let mut identity_client = get_unauthenticated_client(
    "http://127.0.0.1:50054",
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = UploadOneTimeKeysRequest {
    user_id: device_info.user_id,
    device_id: device_info.device_id,
    access_token: device_info.access_token,
    content_one_time_pre_keys: vec!["a".to_string(), "b".to_string()],
    notif_one_time_pre_keys: vec!["c".to_string(), "d".to_string()],
  };

  // This send will fail if the one-time keys weren't successfully added
  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .unwrap();
}
