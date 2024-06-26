use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
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
