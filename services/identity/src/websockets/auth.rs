use client_proto::VerifyUserAccessTokenRequest;
use grpc_clients::identity;
use grpc_clients::tonic::Request;
use identity::get_unauthenticated_client;
use identity::protos::unauthenticated as client_proto;
use serde::{Deserialize, Serialize};
use tracing::{debug, error};

use crate::constants::DEFAULT_IDENTITY_ENDPOINT;
use crate::websockets::errors::WebsocketError;

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct AuthMessage {
  #[serde(rename = "userID")]
  pub user_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub access_token: String,
}

const PLACEHOLDER_CODE_VERSION: u64 = 0;
const DEVICE_TYPE: &str = "service";

async fn verify_user_access_token(
  user_id: &str,
  device_id: &str,
  access_token: &str,
) -> Result<bool, WebsocketError> {
  let grpc_client = get_unauthenticated_client(
    DEFAULT_IDENTITY_ENDPOINT,
    PLACEHOLDER_CODE_VERSION,
    DEVICE_TYPE.to_string(),
  )
  .await;

  let mut grpc_client = match grpc_client {
    Ok(grpc_client) => grpc_client,
    Err(e) => {
      error!("Failed to get unauthenticated client: {}", e);
      return Err(WebsocketError::AuthError);
    }
  };

  let message = VerifyUserAccessTokenRequest {
    user_id: user_id.to_string(),
    device_id: device_id.to_string(),
    access_token: access_token.to_string(),
  };

  let request = Request::new(message);
  let response = match grpc_client.verify_user_access_token(request).await {
    Ok(response) => response,
    Err(e) => {
      error!("Failed to verify user access token: {}", e);
      return Err(WebsocketError::AuthError);
    }
  };

  Ok(response.into_inner().token_valid)
}

pub async fn handle_auth_message(message: &str) -> Result<(), WebsocketError> {
  error!("Handling auth message: {}", message);
  let auth_message = serde_json::from_str(message.trim());

  let auth_message: AuthMessage = match auth_message {
    Ok(auth_message) => auth_message,
    Err(e) => {
      error!("Failed to parse auth message: {}", e);
      return Err(WebsocketError::InvalidMessage);
    }
  };

  let user_id = auth_message.user_id;
  let device_id = auth_message.device_id;
  let access_token = auth_message.access_token;

  let is_valid_token =
    verify_user_access_token(&user_id, &device_id, &access_token).await?;

  if is_valid_token {
    debug!("User {} authenticated", user_id);
  } else {
    debug!("User {} not authenticated", user_id);
    return Err(WebsocketError::UnauthorizedDevice);
  }

  Ok(())
}
