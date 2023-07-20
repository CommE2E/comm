use super::*;

use comm_opaque2::client::Login;
use identity_client::{OpaqueLoginFinishRequest, OpaqueLoginStartRequest};
use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn login_user(
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
  debug!("Attempting to login user: {}", username);

  // Set up the gRPC client that will be used to talk to the Identity service
  let channel = get_identity_service_channel().await?;
  let mut identity_client = IdentityClientServiceClient::new(channel);

  // Start OPAQUE registration and send initial registration request
  let mut client_login = Login::new();
  let opaque_login_request = client_login
    .start(&password)
    .map_err(|_| Error::from_reason("Failed to create opaque login request"))?;

  let login_start_request = OpaqueLoginStartRequest {
    opaque_login_request,
    username: username,
    device_key_upload: Some(DeviceKeyUpload {
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
    }),
  };

  debug!("Starting login to identity service");
  let login_start_response = identity_client
    .login_password_user_start(login_start_request)
    .await
    .map_err(handle_grpc_error)?
    .into_inner();

  debug!("Received login response from identity service");
  let opaque_login_upload = client_login
    .finish(&login_start_response.opaque_login_response)
    .map_err(|_| Error::from_reason("Failed to finish opaque login request"))?;
  let login_finish_request = OpaqueLoginFinishRequest {
    session_id: login_start_response.session_id,
    opaque_login_upload,
  };

  debug!("Attempting to finalize opaque login exchange with identity service");
  let login_finish_response = identity_client
    .login_password_user_finish(login_finish_request)
    .await
    .map_err(handle_grpc_error)?
    .into_inner();

  debug!("Finished login with identity service");
  let user_info = UserLoginInfo {
    user_id: login_finish_response.user_id,
    access_token: login_finish_response.access_token,
  };

  Ok(user_info)
}
