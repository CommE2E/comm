use super::*;

use comm_opaque2::client::Login;
use grpc_clients::identity::protos::unauthenticated::{
  OpaqueLoginFinishRequest, OpaqueLoginStartRequest,
};
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
  let mut identity_client = get_identity_client().await?;

  // Start OPAQUE registration and send initial registration request
  let mut client_login = Login::new();
  let opaque_login_request = client_login
    .start(&password)
    .map_err(|_| Error::from_reason("Failed to create opaque login request"))?;

  let login_start_request = OpaqueLoginStartRequest {
    opaque_login_request,
    username,
    device_key_upload: Some(DeviceKeyUpload {
      device_key_info: Some(IdentityKeyInfo {
        payload: signed_identity_keys_blob.payload,
        payload_signature: signed_identity_keys_blob.signature,
        social_proof: None,
      }),
      content_upload: Some(Prekey {
        prekey: content_prekey,
        prekey_signature: content_prekey_signature,
      }),
      notif_upload: Some(Prekey {
        prekey: notif_prekey,
        prekey_signature: notif_prekey_signature,
      }),
      one_time_content_prekeys: content_one_time_keys,
      one_time_notif_prekeys: notif_one_time_keys,
      device_type: DeviceType::Keyserver.into(),
    }),
  };

  debug!("Starting login to identity service");
  let response = identity_client
    .log_in_password_user_start(login_start_request)
    .await
    .map_err(handle_grpc_error)?;
  debug!("Received login response from identity service");

  // We need to get the load balancer cookie from from the response and send it
  // in the subsequent request to ensure it is routed to the same identity
  // service instance as the first request
  let cookie = response
    .metadata()
    .get(RESPONSE_METADATA_COOKIE_KEY)
    .cloned();

  let login_start_response = response.into_inner();

  let opaque_login_upload = client_login
    .finish(&login_start_response.opaque_login_response)
    .map_err(|_| Error::from_reason("Failed to finish opaque login request"))?;

  let mut login_finish_request = Request::new(OpaqueLoginFinishRequest {
    session_id: login_start_response.session_id,
    opaque_login_upload,
  });

  // Cookie won't be available in local dev environments
  if let Some(cookie_metadata) = cookie {
    login_finish_request
      .metadata_mut()
      .insert(REQUEST_METADATA_COOKIE_KEY, cookie_metadata);
  }

  debug!("Attempting to finalize opaque login exchange with identity service");
  let login_finish_response = identity_client
    .log_in_password_user_finish(login_finish_request)
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
