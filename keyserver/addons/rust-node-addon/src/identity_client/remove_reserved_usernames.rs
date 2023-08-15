use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn remove_reserved_username(
  message: String,
  signature: String,
) -> Result<()> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client = get_identity_client_service_channel().await?;

  let remove_reserved_username_request =
    RemoveReservedUsernameRequest { message, signature };

  identity_client
    .remove_reserved_username(remove_reserved_username_request)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?
    .into_inner();

  Ok(())
}
