use client_proto::VerifyUserAccessTokenRequest;
use comm_lib::auth::is_csat_verification_disabled;
use grpc_clients::identity::{self, PlatformMetadata};
use grpc_clients::tonic::Request;
use identity::get_unauthenticated_client;
use identity::protos::unauthenticated as client_proto;

use crate::config::CONFIG;
use crate::error::Error;

// Identity service gRPC clients require a code version and device type.
// We can supply some placeholder values for services for the time being, since
// this metadata is only relevant for devices.
const PLACEHOLDER_CODE_VERSION: u64 = 0;
const DEVICE_TYPE: &str = "service";

/// Returns true if access token is valid
pub async fn verify_user_access_token(
  user_id: &str,
  device_id: &str,
  access_token: &str,
) -> Result<bool, Error> {
  if is_csat_verification_disabled() {
    return Ok(true);
  }

  let mut grpc_client = get_unauthenticated_client(
    &CONFIG.identity_endpoint,
    PlatformMetadata::new(PLACEHOLDER_CODE_VERSION, DEVICE_TYPE),
  )
  .await?;
  let message = VerifyUserAccessTokenRequest {
    user_id: user_id.to_string(),
    device_id: device_id.to_string(),
    access_token: access_token.to_string(),
  };

  let request = Request::new(message);
  let response = grpc_client.verify_user_access_token(request).await?;
  Ok(response.into_inner().token_valid)
}
