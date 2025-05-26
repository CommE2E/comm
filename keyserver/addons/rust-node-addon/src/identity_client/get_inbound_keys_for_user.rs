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

  let inbound_keys_for_user_request = InboundKeysForUserRequest {
    user_id,
    selected_devices: Vec::new(),
  };

  let mut response = identity_client
    .get_inbound_keys_for_user(inbound_keys_for_user_request)
    .await
    .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?
    .into_inner();

  let device_inbound_key_info = DeviceInboundKeyInfo::try_from(
    response
      .devices
      .remove(&device_id)
      .ok_or(Error::from_status(Status::GenericFailure))?,
  )?;

  let identity = response
    .identity
    .ok_or_else(|| Error::from_status(Status::GenericFailure))?;
  let username = Some(identity.username);
  let wallet_address = identity.eth_identity.map(|eth| eth.wallet_address);

  let inbound_key_info_response = InboundKeyInfoResponse {
    payload: device_inbound_key_info.payload,
    payload_signature: device_inbound_key_info.payload_signature,
    content_prekey: device_inbound_key_info.content_prekey,
    content_prekey_signature: device_inbound_key_info.content_prekey_signature,
    notif_prekey: device_inbound_key_info.notif_prekey,
    notif_prekey_signature: device_inbound_key_info.notif_prekey_signature,
    username,
    wallet_address,
  };

  Ok(inbound_key_info_response)
}
