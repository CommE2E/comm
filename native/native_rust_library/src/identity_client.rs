use comm_opaque2::client::Registration;
use comm_opaque2::grpc::opaque_error_to_grpc_status as handle_error;
use tonic::transport::Channel;
use tonic::Status;

use crate::identity;
use crate::IdentityClient;
use identity::identity_client_service_client::IdentityClientServiceClient;

#[cfg(debug_assertions)]
async fn open_identity_channel(
) -> Result<IdentityClientServiceClient<Channel>, Status> {
  IdentityClientServiceClient::connect("https://localhost:50054")
    .await
    .map_err(|_| {
      Status::unavailable("Could not connect to local identity service")
    })
}

#[cfg(not(debug_assertions))]
async fn open_identity_channel(
) -> Result<IdentityClientServiceClient<Channel>, Status> {
  IdentityClientServiceClient::connect("https://comm.app:50054")
    .await
    .map_err(|_| Status::unavailable("Could not connect to identity service"))
}

pub async fn register_user(
  username: String,
  password: String,
  key_payload: String,
  key_payload_signature: String,
  identity_prekey: String,
  identity_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  identity_onetime_keys: Vec<String>,
  notif_onetime_keys: Vec<String>,
) -> Result<String, Status> {
  let mut client_register = Registration::new();
  let register_message =
    client_register.start(&password).map_err(handle_error)?;

  let register_request = identity::RegistrationStartRequest {
    opaque_registration_request: register_message,
    username,
    device_key_upload: Some(identity::DeviceKeyUpload {
      device_key_info: Some(identity::IdentityKeyInfo {
        payload: key_payload,
        payload_signature: key_payload_signature,
        social_proof: None,
      }),
      identity_upload: Some(identity::PreKey {
        pre_key: identity_prekey,
        pre_key_signature: identity_prekey_signature,
      }),
      notif_upload: Some(identity::PreKey {
        pre_key: notif_prekey,
        pre_key_signature: notif_prekey_signature,
      }),
      onetime_identity_prekeys: identity_onetime_keys,
      onetime_notif_prekeys: notif_onetime_keys,
    }),
  };

  let mut identity_client = open_identity_channel().await?;
  let register_response = identity_client
    .register_password_user_start(register_request)
    .await?
    .into_inner();

  let register_finish = client_register
    .finish(&password, &register_response.opaque_registration_response)
    .map_err(handle_error)?;
  let finish_request = identity::RegistrationFinishRequest {
    session_id: register_response.session_id,
    opaque_registration_upload: register_finish,
  };

  let final_response = identity_client
    .register_password_user_finish(finish_request)
    .await?
    .into_inner();

  Ok(final_response.access_token)
}

// User could be logging in from new device, need to resend device information
pub async fn login_user_pake(
  mut _client: Box<IdentityClient>,
  _username: String,
  _password: String,
  _key_payload: String,
  _key_payload_signature: String,
  _identity_prekey: String,
  _identity_prekey_signature: String,
  _notif_prekey: String,
  _notif_prekey_signature: String,
  _identity_onetime_keys: Vec<String>,
  _notif_onetime_keys: Vec<String>,
) -> Result<String, Status> {
  unimplemented!();
}

pub async fn login_user_wallet(
  mut _client: Box<IdentityClient>,
  _siwe_message: String,
  _siwe_signature: String,
  _key_payload: String,
  _key_payload_signature: String,
  _identity_prekey: String,
  _identity_prekey_signature: String,
  _notif_prekey: String,
  _notif_prekey_signature: String,
  _identity_onetime_keys: Vec<String>,
  _notif_onetime_keys: Vec<String>,
) -> Result<String, Status> {
  unimplemented!();
}
