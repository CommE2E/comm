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
    let http_client = reqwest::Client::builder().build()?;

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

    let mut headers = HeaderMap::new();
    headers.insert(
      reqwest::header::CONTENT_TYPE,
      HeaderValue::from_static("application/json"),
    );

    let bearer = self.token.get_auth_bearer().await?;
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&bearer)?);

    let url = format!(
      "https://fcm.googleapis.com/v1/projects/{}/messages:send",
      self.config.project_id
    );

    let msg_wrapper = FCMMessageWrapper { message };
    let payload = serde_json::to_string(&msg_wrapper).unwrap();

    let response = self
      .http_client
      .post(&url)
      .headers(headers)
      .body(payload)
      .send()
      .await?;

    match response.status() {
      StatusCode::OK => {
        debug!("Successfully sent FCM notif to {}", token);
        Ok(())
      }
      error_status => {
        let body = response
          .text()
          .await
          .unwrap_or_else(|error| format!("Error occurred: {}", error));
        error!(
          "Failed sending FCM notification to: {}. Status: {}. Body: {}",
          token, error_status, body
        );
        let fcm_error = FCMErrorResponse::from_status(error_status, body);
        Err(FCMError(fcm_error))
      }
    }
  }
}
