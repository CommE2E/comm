mod proto {
  tonic::include_proto!("identity.client");
}
use comm_opaque2::client::Registration;
use proto::identity_client_service_client::IdentityClientServiceClient;
use proto::{
  DeviceKeyUpload, IdentityKeyInfo, PreKey, RegistrationFinishRequest,
  RegistrationStartRequest, UploadOneTimeKeysRequest,
  VerifyUserAccessTokenRequest,
};
use rand::{distributions::Alphanumeric, Rng};

struct DeviceInfo {
  pub username: String,
  pub user_id: String,
  pub device_id: String,
  pub access_token: String,
}

async fn create_device() -> DeviceInfo {
  let password = "pass";
  let username: String = rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(7)
    .map(char::from)
    .collect();

  // TODO: Generate dynamic valid olm account info
  let example_payload = r#"{\"notificationIdentityPublicKeys\":{\"curve25519\":\"DYmV8VdkjwG/VtC8C53morogNJhpTPT/4jzW0/cxzQo\",\"ed25519\":\"D0BV2Y7Qm36VUtjwyQTJJWYAycN7aMSJmhEsRJpW2mk\"},\"primaryIdentityPublicKeys\":{\"curve25519\":\"Y4ZIqzpE1nv83kKGfvFP6rifya0itRg2hifqYtsISnk\",\"ed25519\":\"cSlL+VLLJDgtKSPlIwoCZg0h0EmHlQoJC08uV/O+jvg\"}}"#;
  // The ed25519 value from the olm payload
  let device_id = r#"cSlL+VLLJDgtKSPlIwoCZg0h0EmHlQoJC08uV/O+jvg"#;

  let mut client_registration = Registration::new();
  let opaque_registration_request =
    client_registration.start(&password).unwrap();
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
      onetime_content_prekeys: Vec::new(),
      onetime_notif_prekeys: Vec::new(),
    }),
  };

  // TODO: allow endpoint to be configured
  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054")
      .await
      .expect("Couldn't connect to identitiy service");

  let registration_start_response = identity_client
    .register_password_user_start(registration_start_request)
    .await
    .unwrap()
    .into_inner();

  let opaque_registration_upload = client_registration
    .finish(
      &password,
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

  return DeviceInfo {
    username: username.to_string(),
    device_id: device_id.to_string(),
    user_id: registration_finish_response.user_id,
    access_token: registration_finish_response.access_token,
  };
}

#[tokio::test]
async fn verify_access_token() {
  let device_info = create_device().await;

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054")
      .await
      .expect("Couldn't connect to identitiy service");

  let verify_request = VerifyUserAccessTokenRequest {
    user_id: device_info.user_id,
    signing_public_key: device_info.device_id,
    access_token: device_info.access_token,
  };

  let response = identity_client
    .verify_user_access_token(verify_request)
    .await
    .unwrap();

  assert_eq!(response.into_inner().token_valid, true);
}

#[tokio::test]
async fn upload_one_time_keys() {
  let device_info = create_device().await;

  let mut identity_client =
    IdentityClientServiceClient::connect("http://127.0.0.1:50054")
      .await
      .expect("Couldn't connect to identitiy service");

  let upload_request = UploadOneTimeKeysRequest {
    user_id: device_info.user_id,
    device_id: device_info.device_id,
    access_token: device_info.access_token,
    content_one_time_pre_keys: vec!["a".to_string(), "b".to_string()],
    notif_one_time_pre_keys: vec!["c".to_string(), "d".to_string()],
  };

  // This send will fail if the one-time keys weren't successfully added
  identity_client
    .upload_one_time_keys(upload_request)
    .await
    .unwrap();
}
