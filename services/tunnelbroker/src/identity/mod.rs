use client_proto::VerifyUserAccessTokenRequest;
use grpc_clients::identity;
use grpc_clients::tonic::Request;
use identity::get_unauthenticated_client;
use identity::protos::unauthenticated as client_proto;

use crate::config::CONFIG;
use crate::error::Error;

/// Returns true if access token is valid
pub async fn verify_user_access_token(
  user_id: &str,
  device_id: &str,
  access_token: &str,
) -> Result<bool, Error> {
  let mut grpc_client =
    get_unauthenticated_client(&CONFIG.identity_endpoint).await?;
  let message = VerifyUserAccessTokenRequest {
    user_id: user_id.to_string(),
    signing_public_key: device_id.to_string(),
    access_token: access_token.to_string(),
  };

  let request = Request::new(message);
  let response = grpc_client.verify_user_access_token(request).await?;
  Ok(response.into_inner().token_valid)
}
