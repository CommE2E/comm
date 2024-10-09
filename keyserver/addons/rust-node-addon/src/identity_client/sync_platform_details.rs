use super::*;

use grpc_clients::identity::protos::unauth::Empty;
use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn sync_platform_details(
  user_id: String,
  device_id: String,
  access_token: String,
) -> Result<()> {
  let mut identity_client =
    get_authenticated_identity_client(user_id, device_id, access_token).await?;

  debug!("Syncing platform details with identity service");
  identity_client
    .sync_platform_details(Empty {})
    .await
    .map_err(handle_grpc_error)?;

  Ok(())
}
