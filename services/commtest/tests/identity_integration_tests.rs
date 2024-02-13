use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::{
  get_unauthenticated_client,
  protos::unauthenticated::{
    find_user_id_request::Identifier, FindUserIdRequest,
  },
};

#[tokio::test]
async fn find_user_id_by_username() {
  let device_info = register_user_device(None, None).await;

  let mut client = get_unauthenticated_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
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
