use crate::constants::error_types;
use crate::constants::PUSH_SERVICE_REQUEST_TIMEOUT;
use crate::notifs::fcm::config::FCMConfig;
use crate::notifs::fcm::error::Error::FCMError;
use crate::notifs::fcm::firebase_message::{FCMMessage, FCMMessageWrapper};
use crate::notifs::fcm::response::FCMErrorResponse;
use crate::notifs::fcm::token::FCMToken;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::StatusCode;
use std::time::Duration;
use tracing::{debug, error};

pub mod config;
pub mod error;
pub mod firebase_message;
pub mod response;
mod token;

#[derive(Clone)]
pub struct FCMClient {
  http_client: reqwest::Client,
  config: FCMConfig,
  token: FCMToken,
}

impl FCMClient {
  pub fn new(config: &FCMConfig) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder()
      .timeout(PUSH_SERVICE_REQUEST_TIMEOUT)
      .build()?;

    // Token must be a short-lived token (60 minutes) and in a reasonable
    // timeframe.
    let token_ttl = Duration::from_secs(60 * 55);
    let token = FCMToken::new(&config.clone(), token_ttl)?;

    Ok(FCMClient {
      http_client,
      config: config.clone(),
      token,
    })
  }

  pub async fn send(&self, message: FCMMessage) -> Result<(), error::Error> {
    let token = message.token.clone();
    debug!("Sending FCM notif to {}", token);

    let msg_wrapper = FCMMessageWrapper { message };
    let payload = serde_json::to_string(&msg_wrapper).unwrap();
    let mut is_retry = false;

    loop {
      let mut headers = HeaderMap::new();
      headers.insert(
        reqwest::header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
      );
      let bearer = self.token.get_auth_bearer(is_retry).await?;
      headers.insert(AUTHORIZATION, HeaderValue::from_str(&bearer)?);

      let url = format!(
        "https://fcm.googleapis.com/v1/projects/{}/messages:send",
        self.config.project_id
      );

      let response = self
        .http_client
        .post(&url)
        .headers(headers)
        .body(payload.clone())
        .send()
        .await?;

      match response.status() {
        StatusCode::OK => {
          debug!("Successfully sent FCM notif to {}", token);
          return Ok(());
        }
        StatusCode::UNAUTHORIZED if !is_retry => {
          is_retry = true;
          debug!("Retrying after first 401 to regenerate token.");
          continue;
        }
        error_status => {
          let body = response
            .text()
            .await
            .unwrap_or_else(|error| format!("Error occurred: {}", error));
          error!(
            errorType = error_types::FCM_ERROR,
            "Failed sending FCM notification to: {}. Status: {}. Body: {}",
            token,
            error_status,
            body
          );
          let fcm_error = FCMErrorResponse::from_status(error_status, body);
          return Err(FCMError(fcm_error));
        }
      }
    }
  }
}
