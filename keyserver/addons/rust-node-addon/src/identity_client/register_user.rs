use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn register_user(
  username: String,
  password: String,
  device_keys: DeviceKeys,
) -> Result<()> {
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
      payload: device_keys.key_payload,
      payload_signature: device_keys.key_payload_signature,
      social_proof: None,
    }),
    identity_upload: Some(identity_client::PreKey {
      pre_key: device_keys.identity_prekey,
      pre_key_signature: device_keys.identity_prekey_signature,
    }),
    notif_upload: Some(identity_client::PreKey {
      pre_key: device_keys.notif_prekey,
      pre_key_signature: device_keys.notif_prekey_signature,
    }),
    onetime_identity_prekeys: device_keys.identity_onetime_keys,
    onetime_notif_prekeys: device_keys.notif_onetime_keys,
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

  // Keyserver doesn't need the access token, so we just return unit
  Ok(())
}
