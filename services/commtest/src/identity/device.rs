use comm_opaque2::client::{Login, Registration};
use grpc_clients::identity::{get_auth_client, get_unauthenticated_client};
use rand::{distributions::Alphanumeric, Rng};

use crate::identity::olm_account_infos::{
  ClientPublicKeys, DEFAULT_CLIENT_KEYS,
};

use crate::service_addr;
use grpc_clients::identity::protos::unauth::{
  DeviceKeyUpload, DeviceType, Empty, IdentityKeyInfo,
  OpaqueLoginFinishRequest, OpaqueLoginStartRequest, Prekey,
  RegistrationFinishRequest, RegistrationStartRequest,
};

pub const PLACEHOLDER_CODE_VERSION: u64 = 0;
pub const DEVICE_TYPE: &str = "service";
const PASSWORD: &str = "pass";

pub struct DeviceInfo {
  pub username: String,
  pub user_id: String,
  pub device_id: String,
  pub access_token: String,
}

/// Register a new user with a device.
/// - Gives random username (returned by function).
/// - Device type defaults to keyserver.
/// - Device ID taken from `keys` (ed25519), see [`DEFAULT_CLIENT_KEYS`]
pub async fn register_user_device(
  keys: Option<&ClientPublicKeys>,
  device_type: Option<DeviceType>,
) -> DeviceInfo {
  let username: String = rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(7)
    .map(char::from)
    .collect();

  // TODO: Generate dynamic valid olm account info
  let keys = keys.unwrap_or_else(|| &DEFAULT_CLIENT_KEYS);
  let example_payload =
    serde_json::to_string(&keys).expect("Failed to serialize example payload");
  // The ed25519 value from the olm payload
  let device_id = &keys.primary_identity_public_keys.ed25519;
  let device_type = device_type.unwrap_or(DeviceType::Keyserver);

  let mut client_registration = Registration::new();
  let opaque_registration_request =
    client_registration.start(PASSWORD).unwrap();
  let registration_start_request = RegistrationStartRequest {
    opaque_registration_request,
    username: username.to_string(),
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: example_payload.to_string(),
        payload_signature: "foo".to_string(),
        social_proof: None,
      }),
      content_upload: Some(Prekey {
        prekey: "content_prekey".to_string(),
        prekey_signature: "content_prekey_sig".to_string(),
      }),
      notif_upload: Some(Prekey {
        prekey: "notif_prekey".to_string(),
        prekey_signature: "notif_prekey_sig".to_string(),
      }),
      one_time_content_prekeys: Vec::new(),
      one_time_notif_prekeys: Vec::new(),
      device_type: device_type.into(),
    }),
  };

  let mut identity_client = get_unauthenticated_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let registration_start_response = identity_client
    .register_password_user_start(registration_start_request)
    .await
    .unwrap()
    .into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      PASSWORD,
      &registration_start_response.opaque_registration_response,
    )
    .unwrap();
  let registration_finish_request = RegistrationFinishRequest {
    session_id: registration_start_response.session_id,
    opaque_registration_upload,
  };

  let registration_finish_response = identity_client
    .register_password_user_finish(registration_finish_request)
    .await
    .unwrap()
    .into_inner();

  DeviceInfo {
    username: username.to_string(),
    device_id: device_id.to_string(),
    user_id: registration_finish_response.user_id,
    access_token: registration_finish_response.access_token,
  }
}

/// Log in existing user with a device.
/// - Tries to log in with given username (it has to be already registered)
/// - Device type defaults to keyserver.
/// - Device ID taken from `keys` (ed25519), see [`DEFAULT_CLIENT_KEYS`]
pub async fn login_user_device(
  username: &str,
  keys: Option<&ClientPublicKeys>,
  device_type: Option<DeviceType>,
  force: Option<bool>,
) -> DeviceInfo {
  // TODO: Generate dynamic valid olm account info
  let keys = keys.unwrap_or_else(|| &DEFAULT_CLIENT_KEYS);
  let example_payload =
    serde_json::to_string(&keys).expect("Failed to serialize example payload");
  // The ed25519 value from the olm payload
  let device_id = &keys.primary_identity_public_keys.ed25519;
  let device_type = device_type.unwrap_or(DeviceType::Keyserver);

  let mut client_login = Login::new();
  let opaque_login_request = client_login.start(PASSWORD).unwrap();
  let login_start_request = OpaqueLoginStartRequest {
    opaque_login_request,
    username: username.to_string(),
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: example_payload.to_string(),
        payload_signature: "foo".to_string(),
        social_proof: None,
      }),
      content_upload: Some(Prekey {
        prekey: "content_prekey".to_string(),
        prekey_signature: "content_prekey_sig".to_string(),
      }),
      notif_upload: Some(Prekey {
        prekey: "notif_prekey".to_string(),
        prekey_signature: "notif_prekey_sig".to_string(),
      }),
      one_time_content_prekeys: Vec::new(),
      one_time_notif_prekeys: Vec::new(),
      device_type: device_type.into(),
    }),
    force,
  };

  let mut identity_client = get_unauthenticated_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldn't connect to identity service");

  let login_start_response = identity_client
    .log_in_password_user_start(login_start_request)
    .await
    .unwrap()
    .into_inner();

  let opaque_login_upload = client_login
    .finish(&login_start_response.opaque_login_response)
    .unwrap();

  let login_finish_request = OpaqueLoginFinishRequest {
    session_id: login_start_response.session_id,
    opaque_login_upload,
  };

  let login_finish_response = identity_client
    .log_in_password_user_finish(login_finish_request)
    .await
    .unwrap()
    .into_inner();

  DeviceInfo {
    username: username.to_string(),
    device_id: device_id.to_string(),
    user_id: login_finish_response.user_id,
    access_token: login_finish_response.access_token,
  }
}

pub async fn logout_user_device(device_info: DeviceInfo) {
  let DeviceInfo {
    user_id,
    device_id,
    access_token,
    ..
  } = device_info;
  let mut client = get_auth_client(
    &service_addr::IDENTITY_GRPC.to_string(),
    user_id,
    device_id,
    access_token,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await
  .expect("Couldnt connect to auth identity service");

  client
    .log_out_user(Empty {})
    .await
    .expect("Failed to logout user");
}
