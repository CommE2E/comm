use identity_search_messages::IdentitySearchAuthMessage;
use tracing::{debug, error};

use crate::constants::error_types;
use crate::websockets::errors::WebsocketError;

#[tracing::instrument(skip_all)]
pub async fn handle_auth_message(
  db_client: &crate::DatabaseClient,
  message: &str,
) -> Result<(), WebsocketError> {
  let Ok(auth_message) = serde_json::from_str(message.trim()) else {
    error!(
      errorType = error_types::SEARCH_LOG,
      "Failed to parse auth message"
    );
    return Err(WebsocketError::InvalidMessage);
  };

  let IdentitySearchAuthMessage {
    user_id,
    device_id,
    access_token,
  } = auth_message;

  let is_valid_token = db_client
    .verify_access_token(user_id.clone(), device_id, access_token)
    .await
    .map_err(|err| {
      error!(
        errorType = error_types::SEARCH_LOG,
        "Failed to verify user access token: {:?}", err
      );
      WebsocketError::AuthError
    })?;

  if is_valid_token {
    debug!("User {} authenticated", user_id);
    Ok(())
  } else {
    debug!("User {} not authenticated", user_id);
    Err(WebsocketError::UnauthorizedDevice)
  }
}
