use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn add_reserved_username(
  username: String,
  signature: String,
) -> Result<()> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let channel = get_identity_service_channel().await?;
  let mut identity_client = IdentityClientServiceClient::new(channel);

  let add_reserved_username_request = AddReservedUsernameRequest {
    username,
    signature,
  };

  identity_client
    .add_reserved_username(add_reserved_username_request)
    .await
    .map_err(|_| Error::from_status(Status::GenericFailure))?
    .into_inner();

  Ok(())
}
