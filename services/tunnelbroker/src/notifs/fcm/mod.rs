use crate::notifs::fcm::config::FCMConfig;
use crate::notifs::fcm::error::Error::FCMError;
use crate::notifs::fcm::firebase_message::{FCMMessage, FCMMessageWrapper};
use crate::notifs::fcm::response::FCMError::{
  Internal, InvalidArgument, QuotaExceeded, SenderIdMismatch,
  ThirdPartyAuthError, Unavailable, Unregistered, UnspecifiedError,
};
use crate::notifs::fcm::response::InvalidArgumentError;
use crate::notifs::fcm::token::FCMToken;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::StatusCode;
use std::time::Duration;
use tracing::{debug, error};

pub mod config;
mod error;
pub mod firebase_message;
mod response;
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
      StatusCode::BAD_REQUEST => {
        let body = response.text().await.unwrap();
        error!(
          "Failed sending FCM notification to: {}. BAD_REQUEST (400). Body: {}",
          token, body
        );
        let error = InvalidArgumentError { details: body };
        Err(FCMError(InvalidArgument(error)))
      }
      StatusCode::NOT_FOUND => {
        error!(
          "Failed sending FCM notification to: {}. NOT_FOUND (404)",
          token
        );
        Err(FCMError(Unregistered))
      }
      StatusCode::FORBIDDEN => {
        error!(
          "Failed sending FCM notification to: {}. FORBIDDEN (403)",
          token
        );
        Err(FCMError(SenderIdMismatch))
      }
      StatusCode::TOO_MANY_REQUESTS => {
        error!(
          "Failed sending FCM notification to: {}. TOO_MANY_REQUESTS (429)",
          token
        );
        Err(FCMError(QuotaExceeded))
      }
      StatusCode::SERVICE_UNAVAILABLE => {
        error!(
          "Failed sending FCM notification to: {}. SERVICE_UNAVAILABLE (503)",
          token
        );
        Err(FCMError(Unavailable))
      }
      StatusCode::INTERNAL_SERVER_ERROR => {
        error!(
          "Failed sending FCM notification to: {}. INTERNAL_SERVER_ERROR (500)",
          token
        );
        Err(FCMError(Internal))
      }
      StatusCode::UNAUTHORIZED => {
        error!(
          "Failed sending FCM notification to: {}. UNAUTHORIZED (401)",
          token
        );
        Err(FCMError(ThirdPartyAuthError))
      }
      _ => {
        error!(
          "Failed sending FCM notification to: {}. Unspecified error",
          token
        );
        Err(FCMError(UnspecifiedError))
      }
    }
  }
}
