use comm_opaque2::client::Registration;
use grpc_clients::identity::get_unauthenticated_client;
use rand::{distributions::Alphanumeric, Rng};

use crate::identity::olm_account_infos::{
  ClientPublicKeys, DEFAULT_CLIENT_KEYS,
};

use crate::service_addr;
use grpc_clients::identity::protos::client::{
  DeviceKeyUpload, DeviceType, IdentityKeyInfo, PreKey,
  RegistrationFinishRequest, RegistrationStartRequest,
};

pub const PLACEHOLDER_CODE_VERSION: u64 = 0;
pub const DEVICE_TYPE: &str = "service";

pub struct DeviceInfo {
  pub username: String,
  pub user_id: String,
  pub device_id: String,
  pub access_token: String,
}

pub async fn create_device(keys: Option<&ClientPublicKeys>) -> DeviceInfo {
  let password = "pass";
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

  let mut client_registration = Registration::new();
  let opaque_registration_request =
    client_registration.start(password).unwrap();
  let registration_start_request = RegistrationStartRequest {
    opaque_registration_request,
    username: username.to_string(),
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: example_payload.to_string(),
        payload_signature: "foo".to_string(),
        social_proof: None,
      }),
      content_upload: Some(PreKey {
        pre_key: "content_prekey".to_string(),
        pre_key_signature: "content_prekey_sig".to_string(),
      }),
      notif_upload: Some(PreKey {
        pre_key: "notif_prekey".to_string(),
        pre_key_signature: "notif_prekey_sig".to_string(),
      }),
      one_time_content_prekeys: Vec::new(),
      one_time_notif_prekeys: Vec::new(),
      device_type: DeviceType::Keyserver.into(),
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
      password,
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
