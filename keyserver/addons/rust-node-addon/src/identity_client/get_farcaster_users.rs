use super::*;
use grpc_clients::identity::protos::unauth::GetFarcasterUsersRequest;
use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn get_farcaster_users(
  farcaster_ids: Vec<String>,
) -> Result<Vec<FarcasterUser>> {
  let mut identity_client = get_identity_client().await?;

  let request = GetFarcasterUsersRequest { farcaster_ids };

  debug!("Getting Farcaster users from Identity service");
  let response = identity_client
    .get_farcaster_users(request)
    .await
    .map_err(handle_grpc_error)?;

  let mapped_response: Vec<FarcasterUser> = response
    .into_inner()
    .farcaster_users
    .into_iter()
    .map(|farcaster_user| FarcasterUser {
      user_id: farcaster_user.user_id,
      username: farcaster_user.username,
      farcaster_id: farcaster_user.farcaster_id,
      supports_farcaster_dcs: farcaster_user.has_farcaster_dcs_token,
    })
    .collect();

  Ok(mapped_response)
}

// This struct should not be altered without also updating FarcasterUser in
// lib/types/identity-service-types.js
#[napi(object)]
pub struct FarcasterUser {
  #[napi(js_name = "userID")]
  pub user_id: String,
  pub username: String,
  #[napi(js_name = "farcasterID")]
  pub farcaster_id: String,
  #[napi(js_name = "supportsFarcasterDCs")]
  pub supports_farcaster_dcs: bool,
}
