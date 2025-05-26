use commtest::identity::device::{
  register_user_device, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account::generate_random_olm_key;
use commtest::service_addr;
use commtest::tunnelbroker::socket::{create_socket, receive_message};
use futures_util::StreamExt;
use grpc_clients::identity::protos::authenticated::{
  OutboundKeysForUserRequest, UploadOneTimeKeysRequest,
};
use grpc_clients::identity::{get_auth_client, DeviceType, PlatformMetadata};
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
  // This function registers a device without uploading OTKs
  let keyserver = register_user_device(None, Some(DeviceType::Keyserver)).await;

  let mut client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    keyserver.user_id.clone(),
    keyserver.device_id.clone(),
    keyserver.access_token.clone(),
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let content_one_time_prekeys = vec![generate_random_olm_key()];
  let notif_one_time_prekeys = vec![generate_random_olm_key()];
  let upload_request = UploadOneTimeKeysRequest {
    content_one_time_prekeys,
    notif_one_time_prekeys,
  };

  client.upload_one_time_keys(upload_request).await.unwrap();

  // Request outbound keys, which should trigger identity service to ask for more keys
  let keyserver_request = OutboundKeysForUserRequest {
    user_id: keyserver.user_id.clone(),
    selected_devices: Vec::new(),
  };

  println!("Getting keyserver info for user, {}", keyserver.user_id);
  let _first_reponse = client
    .get_keyserver_keys(keyserver_request.clone())
    .await
    .expect("keyserver keys request failed")
    .into_inner()
    .keyserver_info
    .unwrap();

  // The current threshold is 5, but we only uploaded only two.
  // Should receive request from Tunnelbroker to refresh key.

  // Create Tunnelbroker session as a keyserver
  let mut socket = create_socket(&keyserver).await.unwrap();
  let response = receive_message(&mut socket).await.unwrap();
  let serialized_response: RefreshKeyRequest =
    serde_json::from_str(&response).unwrap();

  let expected_response = RefreshKeyRequest {
    device_id: keyserver.device_id.to_string(),
    number_of_keys: 5,
  };

  assert_eq!(serialized_response, expected_response);
}
