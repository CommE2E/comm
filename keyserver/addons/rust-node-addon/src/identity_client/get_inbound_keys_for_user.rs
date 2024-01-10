use grpc_clients::identity::protos::authenticated::InboundKeysForUserRequest;

use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn get_inbound_keys_for_user_device(
  auth_user_id: String,
  auth_device_id: String,
  auth_access_token: String,
  user_id: String,
  device_id: String,
) -> Result<InboundKeyInfoResponse> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client = get_authenticated_identity_client(
    auth_user_id,
    auth_device_id,
    auth_access_token,
  )
  .await?;

  let inbound_keys_for_user_request = InboundKeysForUserRequest { user_id };

  let mut response = identity_client
    .get_inbound_keys_for_user(inbound_keys_for_user_request)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?
    .into_inner();

  let inbound_key_info = InboundKeyInfoResponse::try_from(
    response
      .devices
      .remove(&device_id)
      .ok_or(Error::from_status(Status::GenericFailure))?,
  )?;

  Ok(inbound_key_info)
}
