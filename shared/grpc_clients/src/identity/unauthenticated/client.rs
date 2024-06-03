/// This file is meant to contain commonly used RPCs
use crate::{error::Error, identity::PlatformMetadata};

use super::get_unauthenticated_client;
use crate::identity::protos::unauthenticated::{
  Empty, VerifyUserAccessTokenRequest,
};

use tonic::Request;

/// Returns true if access token is valid
pub async fn verify_user_access_token(
  identity_url: &str,
  user_id: &str,
  device_id: &str,
  access_token: &str,
  code_version: u64,
  device_type: String,
) -> Result<bool, Error> {
  let mut grpc_client = get_unauthenticated_client(
    identity_url,
    PlatformMetadata::new(code_version, device_type),
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

pub async fn ping(
  identity_url: &str,
  code_version: u64,
  device_type: String,
) -> Result<(), Error> {
  let mut grpc_client = get_unauthenticated_client(
    identity_url,
    PlatformMetadata::new(code_version, device_type),
  )
  .await?;
  let request = Request::new(Empty {});
  grpc_client.ping(request).await?;
  Ok(())
}
