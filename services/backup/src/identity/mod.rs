use comm_lib::crypto::siwe;
use grpc_clients::{
  error::Error,
  identity::{
    authenticated::get_services_auth_client,
    get_unauthenticated_client,
    protos::{
      auth::{PeersDeviceListsRequest, UserDevicesPlatformDetails},
      unauth::FindUserIdRequest,
      unauthenticated::find_user_id_request::Identifier,
    },
    DeviceType, PlatformMetadata,
  },
  tonic::Request,
};
use tracing::debug;

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

pub async fn find_keyserver_device_for_user(
  user_id: &str,
  auth_service: &comm_lib::auth::AuthService,
) -> Result<Option<String>, BackupError> {
  let services_token = auth_service.get_services_token().await?;
  let mut grpc_client = get_services_auth_client(
    &CONFIG.identity_endpoint,
    services_token.as_str().to_owned(),
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await?;

  let request = PeersDeviceListsRequest {
    user_ids: vec![user_id.to_string()],
  };
  let response = grpc_client
    .get_device_lists_for_users(Request::new(request))
    .await
    .map_err(Error::GrpcStatus)?
    .into_inner();

  let Some(UserDevicesPlatformDetails {
    devices_platform_details,
  }) = response.users_devices_platform_details.get(user_id)
  else {
    debug!("No device list found for user {user_id}");
    return Ok(None);
  };

  for (device_id, device_details) in devices_platform_details {
    if device_details.device_type() == DeviceType::Keyserver {
      debug!("Found keyserver for user {user_id}. Device ID: {device_id}");
      return Ok(Some(device_id.to_string()));
    }
  }

  debug!("No keyserver found for user {user_id}");
  Ok(None)
}
