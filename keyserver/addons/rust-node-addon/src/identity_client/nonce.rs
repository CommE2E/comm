use super::*;

use grpc_clients::identity::protos::unauth::Empty;
use tracing::debug;

#[napi]
#[instrument(skip_all)]
pub async fn generate_nonce() -> Result<String> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client = get_identity_client().await?;

  debug!("Getting nonce from Identity service");
  let response = identity_client
    .generate_nonce(Empty {})
    .await
    .map_err(handle_grpc_error)?;

  Ok(response.into_inner().nonce)
}
