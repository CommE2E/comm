use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn delete_user(user_id: String) -> Result<()> {
  let channel = Channel::from_static(&IDENTITY_SERVICE_SOCKET_ADDR)
    .connect()
    .await
    .map_err(|_| {
      Error::new(
        Status::GenericFailure,
        "Unable to connect to identity service".to_string(),
      )
    })?;
  let token: MetadataValue<_> = AUTH_TOKEN
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
