use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use commtest::tunnelbroker::socket::{create_socket, receive_message};
use futures_util::StreamExt;
use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::authenticated::{
  OutboundKeysForUserRequest, UploadOneTimeKeysRequest,
};
use tunnelbroker_messages::RefreshKeyRequest;

#[tokio::test]
async fn test_tunnelbroker_invalid_auth() {
  let mut device_info = register_user_device(None, None).await;
  device_info.access_token = "".to_string();
  let socket = create_socket(&device_info).await;
  assert!(matches!(socket, Result::Err(_)))
}

#[tokio::test]
async fn test_tunnelbroker_valid_auth() {
  let device_info = register_user_device(None, None).await;
  let mut socket = create_socket(&device_info).await.unwrap();

  socket
    .next()
    .await
    .expect("Failed to receive response")
    .expect("Failed to read the response");
}

#[tokio::test]
async fn test_refresh_keys_request_upon_depletion() {
  let identity_grpc_endpoint = service_addr::IDENTITY_GRPC.to_string();
  let device_info = register_user_device(None, None).await;

  // Request outbound keys, which should trigger identity service to ask for more keys
  let mut client = get_auth_client(
    &identity_grpc_endpoint,
    device_info.user_id.clone(),
    device_info.device_id,
    device_info.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys: vec!["content1".to_string()],
    notif_one_time_prekeys: vec!["notif1".to_string()],
  };

  client.upload_one_time_keys(upload_request).await.unwrap();

  let keyserver_request = OutboundKeysForUserRequest {
    user_id: device_info.user_id.clone(),
  };

  println!("Getting keyserver info for user, {}", device_info.user_id);
  let _first_reponse = client
    .get_keyserver_keys(keyserver_request.clone())
    .await
    .expect("keyserver keys request failed")
    .into_inner()
    .keyserver_info
    .unwrap();

  // The current threshold is 5, but we only upload two. Should receive request
  // from Tunnelbroker to refresh keys
  // Create session as a keyserver

  let device_info = register_user_device(None, None).await;
  let mut socket = create_socket(&device_info).await.unwrap();
  for _ in 0..2 {
    let response = receive_message(&mut socket).await.unwrap();
    let serialized_response: RefreshKeyRequest =
      serde_json::from_str(&response).unwrap();

    let expected_response = RefreshKeyRequest {
      device_id: device_info.device_id.to_string(),
      number_of_keys: 5,
    };

    assert_eq!(serialized_response, expected_response);
  }
}
