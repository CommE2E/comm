use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn privileged_reset_user_password(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  username: String,
  password: String,
) -> Result<()> {
  let mut identity_client = get_authenticated_identity_client(
    auth_user_id,
    auth_device_id,
    auth_access_token,
  )
  .await?;

  let mut opaque_registration = comm_opaque2::client::Registration::new();
  let opaque_registration_request =
    opaque_registration.start(&password).map_err(|_| {
      Error::from_reason("Failed to create opaque registration request")
    })?;

  let privileged_reset_user_password_start_request =
    PrivilegedResetUserPasswordStartRequest {
      opaque_registration_request,
      username,
    };

  let response = identity_client
    .privileged_reset_user_password_start(
      privileged_reset_user_password_start_request,
    )
    .await
    .map_err(handle_grpc_error)?;

  let privileged_reset_user_password_start_response = response.into_inner();

  let opaque_registration_upload = opaque_registration
    .finish(
      &password,
      &privileged_reset_user_password_start_response
        .opaque_registration_response,
    )
    .map_err(|_| {
      Error::from_reason("Failed to create opaque registration upload")
    })?;

  let privileged_reset_user_password_finish_request =
    PrivilegedResetUserPasswordFinishRequest {
      session_id: privileged_reset_user_password_start_response.session_id,
      opaque_registration_upload,
    };

  identity_client
    .privileged_reset_user_password_finish(
      privileged_reset_user_password_finish_request,
    )
    .await
    .map_err(handle_grpc_error)?;

  Ok(())
}
