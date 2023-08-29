use commtest::identity::device::create_device;

#[tokio::test]
async fn verify_access_token() {
  use grpc_clients::identity::unauthenticated::client::verify_user_access_token;
  let device_info = create_device().await;

  let token_valid = verify_user_access_token(
    "http://127.0.0.1:50054",
    &device_info.user_id,
    &device_info.device_id,
    &device_info.access_token,
  )
  .await
  .expect("Failed to call identity's verify_user_access_token endpoint");

  assert_eq!(token_valid, true);

  // Try again with invalid access token
  let token_valid = verify_user_access_token(
    "http://127.0.0.1:50054",
    &device_info.user_id,
    &device_info.device_id,
    "garbage",
  )
  .await
  .expect("Failed to call identity's verify_user_access_token endpoint");

  assert_eq!(token_valid, false);
}
