use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn privileged_delete_users(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  user_ids: Vec<String>,
) -> Result<()> {
  let mut identity_client = get_authenticated_identity_client(
    auth_user_id,
    auth_device_id,
    auth_access_token,
  )
  .await?;

  let privileged_delete_users_request =
    PrivilegedDeleteUsersRequest { user_ids };

  identity_client
    .privileged_delete_users(privileged_delete_users_request)
    .await
    .map_err(handle_grpc_error)?;

  Ok(())
}
