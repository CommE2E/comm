use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::SigningCapableAccount;
use commtest::service_addr;
use grpc_clients::identity::protos::unauth::{
  Empty, ExistingDeviceLoginRequest,
};
use grpc_clients::identity::PlatformMetadata;
use grpc_clients::identity::{
  get_unauthenticated_client, protos::unauth::VerifyUserAccessTokenRequest,
};

#[tokio::test]
async fn verify_access_token() {
  let identity_grpc_endpoint = service_addr::IDENTITY_GRPC.to_string();
  let device_info = register_user_device(None, None).await;

  let mut identity_client = get_unauthenticated_client(
    &identity_grpc_endpoint,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let verify_request = VerifyUserAccessTokenRequest::from(&device_info);
  let response = identity_client
    .verify_user_access_token(verify_request)
    .await
    .unwrap();

  assert!(response.into_inner().token_valid);
}

#[tokio::test]
async fn refresh_token_test() {
  let identity_grpc_endpoint = service_addr::IDENTITY_GRPC.to_string();
  let mut client = get_unauthenticated_client(
    &identity_grpc_endpoint,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let account = SigningCapableAccount::new();
  let client_keys = account.public_keys();
  let user = register_user_device(Some(&client_keys), None).await;

  // refresh session
  let nonce = client
    .generate_nonce(Empty {})
    .await
    .expect("failed to generate nonce")
    .into_inner()
    .nonce;
  let nonce_signature = account.sign_message(&nonce);
  let new_credentials = client
    .log_in_existing_device(ExistingDeviceLoginRequest {
      user_id: user.user_id.clone(),
      device_id: user.device_id.clone(),
      nonce,
      nonce_signature,
    })
    .await
    .expect("LogInExistingDevice call failed")
    .into_inner();

  // old token should now be invalid
  let old_token_result = client
    .verify_user_access_token(VerifyUserAccessTokenRequest::from(&user))
    .await
    .expect("failed to verify token")
    .into_inner();
  assert!(!old_token_result.token_valid);

  // new token should be valid
  let new_token_result = client
    .verify_user_access_token(VerifyUserAccessTokenRequest {
      user_id: new_credentials.user_id,
      access_token: new_credentials.access_token,
      device_id: user.device_id,
    })
    .await
    .expect("failed to verify token")
    .into_inner();

  assert!(new_token_result.token_valid);
}
