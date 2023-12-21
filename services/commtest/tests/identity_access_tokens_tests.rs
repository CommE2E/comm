use commtest::identity::device::{
  create_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::{
  get_unauthenticated_client, protos::unauth::VerifyUserAccessTokenRequest,
};

#[tokio::test]
async fn verify_access_token() {
  let identity_grpc_endpoint = service_addr::IDENTITY_GRPC.to_string();
  let device_info = create_device(None).await;

  let mut identity_client = get_unauthenticated_client(
    &identity_grpc_endpoint,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let verify_request = VerifyUserAccessTokenRequest {
    user_id: device_info.user_id,
    device_id: device_info.device_id,
    access_token: device_info.access_token,
  };

  let response = identity_client
    .verify_user_access_token(verify_request)
    .await
    .unwrap();

  assert!(response.into_inner().token_valid);
}
