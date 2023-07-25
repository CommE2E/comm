use super::*;

use tracing::{debug, warn};

#[napi]
#[instrument(skip_all)]
pub async fn register_user(
  username: String,
  password: String,
  signed_identity_keys_blob: SignedIdentityKeysBlob,
  content_prekey: String,
  content_prekey_signature: String,
  notif_prekey: String,
  notif_prekey_signature: String,
  content_one_time_keys: Vec<String>,
  notif_one_time_keys: Vec<String>,
) -> Result<UserLoginInfo> {
  debug!("Attempting to register user: {}", username);

  // Set up the gRPC client that will be used to talk to the Identity service
  let channel = get_identity_service_channel().await?;
  let mut identity_client = IdentityClientServiceClient::new(channel);

  // Start OPAQUE registration and send initial registration request
  let mut opaque_registration = comm_opaque2::client::Registration::new();
  let opaque_registration_request = opaque_registration
    .start(&password)
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let device_key_upload = DeviceKeyUpload {
    device_key_info: Some(IdentityKeyInfo {
      payload: signed_identity_keys_blob.payload,
      payload_signature: signed_identity_keys_blob.signature,
      social_proof: None,
    }),
    content_upload: Some(PreKey {
      pre_key: content_prekey,
      pre_key_signature: content_prekey_signature,
    }),
    notif_upload: Some(PreKey {
      pre_key: notif_prekey,
      pre_key_signature: notif_prekey_signature,
    }),
    onetime_content_prekeys: content_one_time_keys,
    onetime_notif_prekeys: notif_one_time_keys,
    device_type: DeviceType::Keyserver.into(),
  };
  let registration_start_request = Request::new(RegistrationStartRequest {
    opaque_registration_request,
    username,
    device_key_upload: Some(device_key_upload),
  });

  // Finish OPAQUE registration and send final registration request
  let registration_start_response = identity_client
    .register_password_user_start(registration_start_request)
    .await
    .map_err(handle_grpc_error)?
    .into_inner();
  debug!("Received registration start response");

  let opaque_registration_upload = opaque_registration
    .finish(
      &password,
      &registration_start_response.opaque_registration_response,
    )
    .map_err(|_| Error::from_status(Status::GenericFailure))?;

  let registration_finish_request = Request::new(RegistrationFinishRequest {
    session_id: registration_start_response.session_id,
    opaque_registration_upload,
  });

  let registration_response = identity_client
    .register_password_user_finish(registration_finish_request)
    .await
    .map_err(handle_grpc_error)?
    .into_inner();

  let user_info = UserLoginInfo {
    user_id: registration_response.user_id,
    access_token: registration_response.access_token,
  };

  Ok(user_info)
}
