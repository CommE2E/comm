use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn register_user(
  username: String,
  password: String,
  device_keys: SignedIdentityKeysBlob,
) -> Result<bool> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let channel = get_identity_service_channel().await?;
  let token: MetadataValue<_> = IDENTITY_SERVICE_CONFIG
    .identity_auth_token
    .parse()
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let mut identity_client = IdentityClientServiceClient::with_interceptor(
    channel,
    |mut req: Request<()>| {
      req.metadata_mut().insert("authorization", token.clone());
      Ok(req)
    },
  );

  // Start OPAQUE registration and send initial registration request
  let mut opaque_registration = comm_opaque2::client::Registration::new();
  let opaque_registration_request = opaque_registration
    .start(&password)
    .map_err(|_| Error::from_status(Status::GenericFailure))?;
  let device_key_upload = DeviceKeyUpload {
    device_key_info: Some(IdentityKeyInfo {
      payload: device_keys.payload,
      payload_signature: device_keys.signature,
      social_proof: None,
    }),
    identity_upload: Some(identity_client::PreKey {
      pre_key: String::new(),
      pre_key_signature: String::new(),
    }),
    notif_upload: Some(identity_client::PreKey {
      pre_key: String::new(),
      pre_key_signature: String::new(),
    }),
    onetime_identity_prekeys: Vec::new(),
    onetime_notif_prekeys: Vec::new(),
  };
  let registration_start_request = Request::new(RegistrationStartRequest {
    opaque_registration_request,
    username,
    device_key_upload: Some(device_key_upload),
  });

  // Finish OPAQUE registration and send final registration request
  let registration_start_response = identity_client
    .register_password_user_start(registration_start_request)
    .await
    .map_err(|_| Error::from_status(Status::GenericFailure))?
    .into_inner();

  let opaque_registration_upload = opaque_registration
    .finish(
      &password,
      &registration_start_response.opaque_registration_response,
    )
    .map_err(|_| Error::from_status(Status::GenericFailure))?;

  let registration_finish_request = Request::new(RegistrationFinishRequest {
    session_id: registration_start_response.session_id,
    opaque_registration_upload,
  });

  identity_client
    .register_password_user_finish(registration_finish_request)
    .await
    .map_err(|_| Error::from_status(Status::GenericFailure))?
    .into_inner();

  // Keyserver doesn't need the access token, so we just return a bool
  Ok(true)
}
