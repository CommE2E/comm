use grpc_clients::identity::protos::client::{
  inbound_keys_for_user_request::Identifier, InboundKeysForUserRequest,
};

use super::*;

#[napi]
#[instrument(skip_all)]
pub async fn get_inbound_keys_for_user_device(
  identifier_type: String,
  identifier_value: String,
  device_id: String,
) -> Result<InboundKeyInfoResponse> {
  // Set up the gRPC client that will be used to talk to the Identity service
  let mut identity_client = get_identity_client().await?;

  let identifier = match identifier_type.as_str() {
    "walletAddress" => Some(Identifier::WalletAddress(identifier_value)),
    "username" => Some(Identifier::Username(identifier_value)),
    _ => return Err(Error::from_status(Status::GenericFailure)),
  };

  let inbound_keys_for_user_request = InboundKeysForUserRequest { identifier };

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
