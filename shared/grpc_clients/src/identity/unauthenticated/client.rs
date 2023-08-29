/// This file is meant to contain commonly used RPC calls
use crate::error::Error;

use super::get_unauthenticated_client;
use crate::identity::protos::unauthenticated::VerifyUserAccessTokenRequest;

use tonic::Request;

/// Returns true if access token is valid
pub async fn verify_user_access_token(
  identity_url: &str,
  user_id: &str,
  device_id: &str,
  access_token: &str,
) -> Result<bool, Error> {
  let mut grpc_client = get_unauthenticated_client(identity_url).await?;

  let message = VerifyUserAccessTokenRequest {
    user_id: user_id.to_string(),
    signing_public_key: device_id.to_string(),
    access_token: access_token.to_string(),
  };

  let request = Request::new(message);
  let response = grpc_client.verify_user_access_token(request).await?;
  return Ok(response.into_inner().token_valid);
}
