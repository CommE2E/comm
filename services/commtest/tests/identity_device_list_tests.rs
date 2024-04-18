use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

use commtest::identity::device::{
  login_user_device, logout_user_device, register_user_device, DEVICE_TYPE,
  PLACEHOLDER_CODE_VERSION,
};
use commtest::service_addr;
use grpc_clients::identity::authenticated::ChainedInterceptedAuthClient;
use grpc_clients::identity::get_auth_client;
use grpc_clients::identity::protos::auth::{
  PeersDeviceListsRequest, UpdateDeviceListRequest,
};
use grpc_clients::identity::protos::authenticated::GetDeviceListRequest;
use grpc_clients::identity::DeviceType;
use serde::Deserialize;
use serde_json::json;

// 1. register user with android device
// 2. register a web device
// 3. remove android device
// 4. register ios device
// 5. get device list - should have 4 updates:
// - [android]
// - [android, web]
// - [web]
// - [ios, web] - mobile should be first
#[tokio::test]
async fn test_device_list_rotation() {
  use commtest::identity::olm_account_infos::{
    DEFAULT_CLIENT_KEYS as DEVICE_KEYS_ANDROID,
    MOCK_CLIENT_KEYS_1 as DEVICE_KEYS_WEB,
    MOCK_CLIENT_KEYS_2 as DEVICE_KEYS_IOS,
  };

  // Create viewer (user that doesn't change devices)
  let viewer = register_user_device(None, None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    viewer.user_id.clone(),
    viewer.device_id,
    viewer.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let android_device_id =
    &DEVICE_KEYS_ANDROID.primary_identity_public_keys.ed25519;
  let web_device_id = &DEVICE_KEYS_WEB.primary_identity_public_keys.ed25519;
  let ios_device_id = &DEVICE_KEYS_IOS.primary_identity_public_keys.ed25519;

  // 1. Register user with primary Android device
  let android =
    register_user_device(Some(&DEVICE_KEYS_ANDROID), Some(DeviceType::Android))
      .await;
  let user_id = android.user_id.clone();
  let username = android.username.clone();

  // 2. Log in a web device
  let _web = login_user_device(
    &username,
    Some(&DEVICE_KEYS_WEB),
    Some(DeviceType::Web),
    false,
  )
  .await;

  // 3. Remove android device
  logout_user_device(android).await;

  // 4. Log in an iOS device
  let _ios = login_user_device(
    &username,
    Some(&DEVICE_KEYS_IOS),
    Some(DeviceType::Ios),
    false,
  )
  .await;

  // Get device list updates for the user
  let device_lists_response: Vec<Vec<String>> =
    get_device_list_history(&mut auth_client, &user_id)
      .await
      .into_iter()
      .map(|device_list| device_list.devices)
      .collect();

  let expected_device_list: Vec<Vec<String>> = vec![
    vec![android_device_id.into()],
    vec![android_device_id.into(), web_device_id.into()],
    vec![web_device_id.into()],
    vec![ios_device_id.into(), web_device_id.into()],
  ];

  assert_eq!(device_lists_response, expected_device_list);
}

#[tokio::test]
async fn test_update_device_list_rpc() {
  // Register user with primary device
  let primary_device = register_user_device(None, None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    primary_device.user_id.clone(),
    primary_device.device_id,
    primary_device.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  // Initial device list check
  let initial_device_list =
    get_device_list_history(&mut auth_client, &primary_device.user_id)
      .await
      .into_iter()
      .map(|device_list| device_list.devices)
      .next()
      .expect("Expected to get single device list update");

  assert!(initial_device_list.len() == 1, "Expected single device");
  let primary_device_id = initial_device_list[0].clone();

  // perform update by adding a new device
  let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
  let raw_update_payload = json!({
    "devices": [primary_device_id, "device2"],
    "timestamp": now.as_millis(),
  });
  let update_payload = json!({
    "rawDeviceList": serde_json::to_string(&raw_update_payload).unwrap(),
  });
  let update_request = UpdateDeviceListRequest {
    new_device_list: serde_json::to_string(&update_payload)
      .expect("failed to serialize payload"),
  };
  auth_client
    .update_device_list(update_request)
    .await
    .expect("Update device list RPC failed");

  // get device list again
  let last_device_list =
    get_device_list_history(&mut auth_client, &primary_device.user_id).await;
  let last_device_list = last_device_list
    .last()
    .expect("Failed to get last device list update");

  // check that the device list is properly updated
  assert_eq!(
    last_device_list.devices,
    vec![primary_device_id, "device2".into()]
  );
}

#[tokio::test]
async fn test_keyserver_force_login() {
  use commtest::identity::olm_account_infos::{
    DEFAULT_CLIENT_KEYS as DEVICE_KEYS_ANDROID,
    MOCK_CLIENT_KEYS_1 as DEVICE_KEYS_KEYSERVER_1,
    MOCK_CLIENT_KEYS_2 as DEVICE_KEYS_KEYSERVER_2,
  };

  // Create viewer (user that doesn't change devices)
  let viewer = register_user_device(None, None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    viewer.user_id.clone(),
    viewer.device_id,
    viewer.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let android_device_id =
    &DEVICE_KEYS_ANDROID.primary_identity_public_keys.ed25519;
  let keyserver_1_device_id =
    &DEVICE_KEYS_KEYSERVER_1.primary_identity_public_keys.ed25519;
  let keyserver_2_device_id =
    &DEVICE_KEYS_KEYSERVER_2.primary_identity_public_keys.ed25519;

  // 1. Register user with primary Android device
  let android =
    register_user_device(Some(&DEVICE_KEYS_ANDROID), Some(DeviceType::Android))
      .await;
  let user_id = android.user_id.clone();
  let username = android.username.clone();

  // 2. Log in on keyserver 1
  let _keyserver_1 = login_user_device(
    &username,
    Some(&DEVICE_KEYS_KEYSERVER_1),
    Some(DeviceType::Keyserver),
    false,
  )
  .await;

  // 3. Log in on keyserver 2 with force = true
  let _keyserver_2 = login_user_device(
    &username,
    Some(&DEVICE_KEYS_KEYSERVER_2),
    Some(DeviceType::Keyserver),
    true,
  )
  .await;

  // Get device list updates for the user
  let device_lists_response: Vec<Vec<String>> =
    get_device_list_history(&mut auth_client, &user_id)
      .await
      .into_iter()
      .map(|device_list| device_list.devices)
      .collect();

  let expected_device_list: Vec<Vec<String>> = vec![
    vec![android_device_id.into()],
    vec![android_device_id.into(), keyserver_1_device_id.into()],
    vec![android_device_id.into()],
    vec![android_device_id.into(), keyserver_2_device_id.into()],
  ];

  assert_eq!(device_lists_response, expected_device_list);
}

#[tokio::test]
async fn test_device_list_multifetch() {
  // Create viewer (user that only auths request)
  let viewer = register_user_device(None, None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    viewer.user_id.clone(),
    viewer.device_id,
    viewer.access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  // Register users and prepare expected device lists
  let mut expected_device_lists = HashMap::new();
  for _ in 0..5 {
    let user = register_user_device(None, None).await;
    expected_device_lists.insert(user.user_id, vec![user.device_id]);
  }

  // Fetch device lists from server
  let user_ids: Vec<_> = expected_device_lists.keys().cloned().collect();
  let request = PeersDeviceListsRequest { user_ids };
  let response_device_lists = auth_client
    .get_device_lists_for_users(request)
    .await
    .expect("GetDeviceListsForUser RPC failed")
    .into_inner()
    .users_device_lists;

  // verify if response has the same user IDs as request
  let expected_user_ids: HashSet<String> =
    expected_device_lists.keys().cloned().collect();
  let response_user_ids: HashSet<String> =
    response_device_lists.keys().cloned().collect();
  let difference: HashSet<_> = expected_user_ids
    .symmetric_difference(&response_user_ids)
    .collect();
  assert!(difference.is_empty(), "User IDs differ: {:?}", difference);

  // verify device list for each user
  for (user_id, expected_devices) in expected_device_lists {
    let response_payload = response_device_lists.get(&user_id).unwrap();

    let returned_devices = SignedDeviceList::from_str(response_payload)
      .expect("failed to deserialize signed device list")
      .into_raw()
      .devices;

    assert_eq!(
      returned_devices, expected_devices,
      "Device list differs for user: {}, Expected {:?}, but got {:?}",
      user_id, expected_devices, returned_devices
    );
  }
}

// See GetDeviceListResponse in identity_authenticated.proto
// for details on the response format.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(unused)]
struct RawDeviceList {
  devices: Vec<String>,
  timestamp: i64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignedDeviceList {
  raw_device_list: String,
}

impl SignedDeviceList {
  fn into_raw(self) -> RawDeviceList {
    self
      .raw_device_list
      .parse()
      .expect("Failed to parse raw device list")
  }
}

impl FromStr for SignedDeviceList {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    serde_json::from_str(s)
  }
}

impl FromStr for RawDeviceList {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    // The device list payload is sent as an escaped JSON payload.
    // Escaped double quotes need to be trimmed before attempting to deserialize
    serde_json::from_str(&s.replace(r#"\""#, r#"""#))
  }
}

async fn get_device_list_history(
  client: &mut ChainedInterceptedAuthClient,
  user_id: &str,
) -> Vec<RawDeviceList> {
  let request = GetDeviceListRequest {
    user_id: user_id.to_string(),
    since_timestamp: None,
  };

  let response = client
    .get_device_list_for_user(request)
    .await
    .expect("Get device list request failed")
    .into_inner();

  response
    .device_list_updates
    .into_iter()
    .map(|update| {
      SignedDeviceList::from_str(&update)
        .expect("Failed to parse device list update")
        .into_raw()
    })
    .collect()
}
