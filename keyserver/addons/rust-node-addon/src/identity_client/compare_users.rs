use super::*;

#[napi]
#[instrument(skip_all)]
async fn compare_users(
  users: Vec<String>,
) -> Result<HashMap<String, Vec<String>>> {
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
  let request = Request::new(CompareUsersRequest { users: users });

  match identity_client.compare_users(request).await {
    Ok(tonic_response) => {
      let compare_users_response = tonic_response.into_inner();
      let mut compare_result = HashMap::new();
      compare_result.insert(
        "usersMissingFromKeyserver".to_string(),
        compare_users_response.users_missing_from_keyserver,
      );
      compare_result.insert(
        "usersMissingFromIdentity".to_string(),
        compare_users_response.users_missing_from_identity,
      );
      Ok(compare_result)
    }
    Err(e) => Err(Error::new(Status::GenericFailure, e.to_string())),
  }
}
