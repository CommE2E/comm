use comm_lib::crypto::siwe;
use grpc_clients::{
  error::Error,
  identity::{
    get_unauthenticated_client, protos::unauth::FindUserIdRequest,
    protos::unauthenticated::find_user_id_request::Identifier,
    PlatformMetadata,
  },
  tonic::Request,
};

use crate::config::CONFIG;
use crate::error::BackupError;

// Identity service gRPC clients require a code version and device type.
// We can supply some placeholder values for services for the time being, since
// this metadata is only relevant for devices.
const PLACEHOLDER_CODE_VERSION: u64 = 0;
const DEVICE_TYPE: &str = "service";

/// Returns `userID` for both Password and Wallet users.
pub async fn find_user_id(
  public_user_identifier: &str,
) -> Result<String, BackupError> {
  let mut grpc_client = get_unauthenticated_client(
    &CONFIG.identity_endpoint,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await?;

  let identifier = if siwe::is_valid_ethereum_address(public_user_identifier) {
    Identifier::WalletAddress(public_user_identifier.to_string())
  } else {
    Identifier::Username(public_user_identifier.to_string())
  };

  let request = FindUserIdRequest {
    identifier: Some(identifier),
  };
  let request = Request::new(request);
  let response = grpc_client
    .find_user_id(request)
    .await
    .map_err(Error::GrpcStatus)?
    .into_inner();

  match response.user_id {
    Some(user_id) => Ok(user_id),
    None => Err(BackupError::NoUserID),
  }
}
