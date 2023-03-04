use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn delete_user(user_id: String) -> Result<()> {
  let channel = get_identity_service_channel().await?;
  let token: MetadataValue<_> = IDENTITY_SERVICE_CONFIG
    .identity_auth_token
    .parse()
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let mut identity_client =
    IdentityServiceClient::with_interceptor(channel, |mut req: Request<()>| {
      req.metadata_mut().insert("authorization", token.clone());
      Ok(req)
    });

  let request = Request::new(DeleteUserRequest {
    user_id: user_id.clone(),
  });
  identity_client
    .delete_user(request)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;

  Ok(())
}
