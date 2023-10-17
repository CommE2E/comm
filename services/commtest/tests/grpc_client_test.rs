use commtest::{identity::device::create_device, service_addr};

#[tokio::test]
async fn verify_access_token() {
  use grpc_clients::identity::unauthenticated::client::verify_user_access_token;
  let device_info = create_device(None).await;
  let code_version = 100;
  let device_type = "android";

  let token_valid = verify_user_access_token(
    &service_addr::IDENTITY_GRPC.to_string(),
    &device_info.user_id,
    &device_info.device_id,
    &device_info.access_token,
    code_version,
    device_type.to_string(),
  )
  .await
  .expect("Failed to call identity's verify_user_access_token endpoint");

  assert!(token_valid);

  // Try again with invalid access token
  let token_valid = verify_user_access_token(
    &service_addr::IDENTITY_GRPC.to_string(),
    &device_info.user_id,
    &device_info.device_id,
    "garbage",
    code_version,
    device_type.to_string(),
  )
  .await
  .expect("Failed to call identity's verify_user_access_token endpoint");

  assert!(!token_valid);
}
