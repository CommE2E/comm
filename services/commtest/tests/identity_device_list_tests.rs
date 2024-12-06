use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

use commtest::identity::device::{
  login_user_device, logout_user_device, register_user_device,
  register_user_device_with_device_list, DEVICE_TYPE, PLACEHOLDER_CODE_VERSION,
};
use commtest::identity::olm_account::{ClientPublicKeys, MockOlmAccount};
use commtest::service_addr;
use grpc_clients::identity::authenticated::ChainedInterceptedAuthClient;
use grpc_clients::identity::protos::auth::{
  PeersDeviceListsRequest, UpdateDeviceListRequest,
};
use grpc_clients::identity::protos::authenticated::GetDeviceListRequest;
use grpc_clients::identity::DeviceType;
use grpc_clients::identity::{get_auth_client, PlatformMetadata};
use serde::{Deserialize, Serialize};

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
  let device_keys_web = ClientPublicKeys::default();
  let device_keys_ios = ClientPublicKeys::default();
  let device_keys_android = ClientPublicKeys::default();

  // Create viewer (user that doesn't change devices)
  let viewer = register_user_device(None, None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    viewer.user_id.clone(),
    viewer.device_id,
    viewer.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let android_device_id = device_keys_android.device_id();
  let web_device_id = device_keys_web.device_id();
  let ios_device_id = device_keys_ios.device_id();

  // 1. Register user with primary Android device
  let android =
    register_user_device(Some(&device_keys_android), Some(DeviceType::Android))
      .await;
  let user_id = android.user_id.clone();
  let username = android.username.clone();

  // 2. Log in a web device
  let _web = login_user_device(
    &username,
    Some(&device_keys_web),
    Some(DeviceType::Web),
    false,
  )
  .await;

  // 3. Remove android device
  logout_user_device(android).await;

  // 4. Log in an iOS device
  let _ios = login_user_device(
    &username,
    Some(&device_keys_ios),
    Some(DeviceType::Ios),
    false,
  )
  .await;

  // Get device list updates for the user
  let device_lists_response: Vec<Vec<String>> =
    get_raw_device_list_history(&mut auth_client, &user_id)
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
  let mut primary_account = MockOlmAccount::new();
  let primary_device_keys = primary_account.public_keys();
  let primary_device =
    register_user_device(Some(&primary_device_keys), None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    primary_device.user_id.clone(),
    primary_device.device_id,
    primary_device.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  // Initial device list check
  let initial_device_list =
    get_raw_device_list_history(&mut auth_client, &primary_device.user_id)
      .await
      .into_iter()
      .map(|device_list| device_list.devices)
      .next()
      .expect("Expected to get single device list update");

  assert!(initial_device_list.len() == 1, "Expected single device");
  let primary_device_id = initial_device_list[0].clone();

  // migrate to signed device lists
  migrate_device_list(
    &mut auth_client,
    &initial_device_list,
    &mut primary_account,
  )
  .await;

  // perform update by adding a new device
  let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
  let devices_payload = vec![primary_device_id, "device2".to_string()];

  let update_payload = SignedDeviceList::from_raw_unsigned(&RawDeviceList {
    devices: devices_payload.clone(),
    timestamp: now.as_millis() as i64,
  });
  let update_request = UpdateDeviceListRequest::from(&update_payload);
  auth_client
    .update_device_list(update_request)
    .await
    .expect("Update device list RPC failed");

  // get device list again
  let last_device_list =
    get_raw_device_list_history(&mut auth_client, &primary_device.user_id)
      .await;
  let last_device_list = last_device_list
    .last()
    .expect("Failed to get last device list update");

  // check that the device list is properly updated
  assert_eq!(last_device_list.devices, devices_payload);
  assert_eq!(last_device_list.timestamp, now.as_millis() as i64);
}

#[tokio::test]
async fn test_device_list_signatures() {
  // device list history as list of tuples: (signature, devices)
  type DeviceListHistoryItem = (Option<String>, Vec<String>);

  // Register user with primary device
  let mut primary_account = MockOlmAccount::new();
  let primary_device_keys = primary_account.public_keys();
  let primary_device_id = primary_device_keys.device_id();
  let user =
    register_user_device(Some(&primary_device_keys), Some(DeviceType::Ios))
      .await;

  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    user.user_id.clone(),
    user.device_id,
    user.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  // Perform unsigned update (add a new device)
  let first_update: DeviceListHistoryItem = {
    let update_payload =
      SignedDeviceList::from_raw_unsigned(&RawDeviceList::new(vec![
        primary_device_id.to_string(),
        "device2".to_string(),
      ]));
    let update_request = UpdateDeviceListRequest::from(&update_payload);
    auth_client
      .update_device_list(update_request)
      .await
      .expect("Unsigned device list update failed");

    (
      update_payload.cur_primary_signature.clone(),
      update_payload.into_raw().devices,
    )
  };

  // perform a migration to signed device list
  let migration_update: DeviceListHistoryItem = {
    let latest_device_list = &first_update.1;
    let updated_device_list = migrate_device_list(
      &mut auth_client,
      latest_device_list,
      &mut primary_account,
    )
    .await;

    (
      updated_device_list.cur_primary_signature.clone(),
      updated_device_list.into_raw().devices,
    )
  };

  // now perform a update (remove a device), but with device list signed
  let second_update: DeviceListHistoryItem = {
    let update_payload = SignedDeviceList::create_signed(
      &RawDeviceList::new(vec![primary_device_id.to_string()]),
      &mut primary_account,
      None,
    );
    let update_request = UpdateDeviceListRequest::from(&update_payload);
    auth_client
      .update_device_list(update_request)
      .await
      .expect("Signed device list update failed");

    (
      update_payload.cur_primary_signature.clone(),
      update_payload.into_raw().devices,
    )
  };

  // now perform a signed update (add a device), but with invalid signature
  {
    let mut update_payload = SignedDeviceList::create_signed(
      &RawDeviceList::new(vec![
        primary_device_id.to_string(),
        "device3".to_string(),
      ]),
      &mut primary_account,
      None,
    );
    // malfolm signature by replacing first characters
    update_payload
      .cur_primary_signature
      .as_mut()
      .expect("signature should be present")
      .replace_range(0..3, "foo");

    let update_request = UpdateDeviceListRequest::from(&update_payload);
    auth_client
      .update_device_list(update_request)
      .await
      .expect_err("RPC should fail for invalid signature");
  }

  // check the history to make sure our updates are correct
  let device_list_history =
    get_device_list_history(&mut auth_client, &user.user_id).await;

  let expected_devices_lists: Vec<DeviceListHistoryItem> = vec![
    (None, vec![primary_device_id.to_string()]), // auto-generated during registration
    first_update,
    migration_update,
    second_update,
  ];
  let actual_device_lists: Vec<DeviceListHistoryItem> = device_list_history
    .into_iter()
    .map(|list| (list.cur_primary_signature.clone(), list.into_raw().devices))
    .collect();

  assert_eq!(actual_device_lists, expected_devices_lists);
}

#[tokio::test]
async fn test_keyserver_force_login() {
  let device_keys_android = ClientPublicKeys::default();
  let device_keys_keyserver_1 = ClientPublicKeys::default();
  let device_keys_keyserver_2 = ClientPublicKeys::default();

  // Create viewer (user that doesn't change devices)
  let viewer = register_user_device(None, None).await;
  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    viewer.user_id.clone(),
    viewer.device_id,
    viewer.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let android_device_id = device_keys_android.device_id();
  let keyserver_1_device_id = device_keys_keyserver_1.device_id();
  let keyserver_2_device_id = device_keys_keyserver_2.device_id();

  // 1. Register user with primary Android device
  let android =
    register_user_device(Some(&device_keys_android), Some(DeviceType::Android))
      .await;
  let user_id = android.user_id.clone();
  let username = android.username.clone();

  // 2. Log in on keyserver 1
  let _keyserver_1 = login_user_device(
    &username,
    Some(&device_keys_keyserver_1),
    Some(DeviceType::Keyserver),
    false,
  )
  .await;

  // 3. Log in on keyserver 2 with force = true
  let _keyserver_2 = login_user_device(
    &username,
    Some(&device_keys_keyserver_2),
    Some(DeviceType::Keyserver),
    true,
  )
  .await;

  // Get device list updates for the user
  let device_lists_response: Vec<Vec<String>> =
    get_raw_device_list_history(&mut auth_client, &user_id)
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
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
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

#[tokio::test]
async fn test_initial_device_list() {
  // create signing account
  let mut primary_account = MockOlmAccount::new();
  let primary_device_keys = primary_account.public_keys();
  let primary_device_id = primary_device_keys.device_id().to_string();

  // create initial device list
  let raw_device_list = RawDeviceList::new(vec![primary_device_id]);
  let signed_list = SignedDeviceList::create_signed(
    &raw_device_list,
    &mut primary_account,
    None,
  );

  // register user with initial list
  let user = register_user_device_with_device_list(
    Some(&primary_device_keys),
    Some(DeviceType::Ios),
    Some(signed_list.as_json_string()),
  )
  .await;

  let mut auth_client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    user.user_id.clone(),
    user.device_id,
    user.access_token,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await
  .expect("Couldn't connect to identity service");

  let mut history =
    get_device_list_history(&mut auth_client, &user.user_id).await;

  let received_list =
    history.pop().expect("Received empty device list history");

  assert!(
    history.is_empty(),
    "Device list history should have no more updates"
  );
  assert_eq!(
    received_list.cur_primary_signature, signed_list.cur_primary_signature,
    "Signature mismatch"
  );
  assert!(received_list.last_primary_signature.is_none());
  assert_eq!(received_list.into_raw(), raw_device_list);
}

// See GetDeviceListResponse in identity_authenticated.proto
// for details on the response format.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
#[allow(unused)]
struct RawDeviceList {
  devices: Vec<String>,
  timestamp: i64,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignedDeviceList {
  raw_device_list: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  cur_primary_signature: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  last_primary_signature: Option<String>,
}

impl RawDeviceList {
  fn new(devices: Vec<String>) -> Self {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    RawDeviceList {
      devices,
      timestamp: now.as_millis() as i64,
    }
  }

  fn as_json_string(&self) -> String {
    serde_json::to_string(self).expect("Failed to serialize RawDeviceList")
  }
}

impl SignedDeviceList {
  fn from_raw_unsigned(raw: &RawDeviceList) -> Self {
    Self {
      raw_device_list: raw.as_json_string(),
      cur_primary_signature: None,
      last_primary_signature: None,
    }
  }

  fn create_signed(
    raw: &RawDeviceList,
    cur_primary_account: &mut MockOlmAccount,
    last_primary_account: Option<&mut MockOlmAccount>,
  ) -> Self {
    let raw_device_list = raw.as_json_string();
    let cur_primary_signature =
      cur_primary_account.sign_message(&raw_device_list);
    let last_primary_signature = last_primary_account
      .map(|account| account.sign_message(&raw_device_list));
    Self {
      raw_device_list,
      cur_primary_signature: Some(cur_primary_signature),
      last_primary_signature,
    }
  }

  fn into_raw(self) -> RawDeviceList {
    self
      .raw_device_list
      .parse()
      .expect("Failed to parse raw device list")
  }

  fn as_json_string(&self) -> String {
    serde_json::to_string(self).expect("Failed to serialize SignedDeviceList")
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

impl From<&SignedDeviceList> for UpdateDeviceListRequest {
  fn from(value: &SignedDeviceList) -> Self {
    Self {
      new_device_list: value.as_json_string(),
    }
  }
}

async fn get_device_list_history(
  client: &mut ChainedInterceptedAuthClient,
  user_id: &str,
) -> Vec<SignedDeviceList> {
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
    })
    .collect()
}

async fn get_raw_device_list_history(
  client: &mut ChainedInterceptedAuthClient,
  user_id: &str,
) -> Vec<RawDeviceList> {
  get_device_list_history(client, user_id)
    .await
    .into_iter()
    .map(|signed| signed.into_raw())
    .collect()
}

async fn migrate_device_list(
  client: &mut ChainedInterceptedAuthClient,
  last_device_list: &[String],
  signing_account: &mut MockOlmAccount,
) -> SignedDeviceList {
  let raw_list = RawDeviceList::new(Vec::from(last_device_list));
  let signed_list =
    SignedDeviceList::create_signed(&raw_list, signing_account, None);
  client
    .update_device_list(UpdateDeviceListRequest::from(&signed_list))
    .await
    .expect("Failed to perform signed device list migration");

  signed_list
}
