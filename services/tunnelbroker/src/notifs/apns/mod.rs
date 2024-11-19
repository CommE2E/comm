use crate::constants::{error_types, PUSH_SERVICE_REQUEST_TIMEOUT};
use crate::notifs::apns::config::APNsConfig;
use crate::notifs::apns::error::Error::ResponseError;
use crate::notifs::apns::headers::{NotificationHeaders, PushType};
use crate::notifs::apns::response::ErrorBody;
use crate::notifs::apns::token::APNsToken;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error};

pub mod config;
pub mod error;
pub(crate) mod headers;
pub mod response;
pub mod token;

#[derive(Clone)]
pub struct APNsClient {
  http2_client: reqwest::Client,
  token: APNsToken,
  is_prod: bool,
}

#[derive(Serialize, Deserialize)]
pub struct APNsNotif {
  pub device_token: String,
  pub headers: NotificationHeaders,
  pub payload: String,
}

impl APNsClient {
  pub fn new(config: &APNsConfig) -> Result<Self, error::Error> {
    let token_ttl = Duration::from_secs(60 * 55);
    let token = APNsToken::new(config, token_ttl)?;

    let http2_client = reqwest::Client::builder()
      .http2_prior_knowledge()
      .http2_keep_alive_interval(Some(Duration::from_secs(5)))
      .http2_keep_alive_while_idle(true)
      .timeout(PUSH_SERVICE_REQUEST_TIMEOUT)
      .build()?;

    Ok(APNsClient {
      http2_client,
      token,
      is_prod: config.production,
    })
  }

  async fn build_headers(
    &self,
    notif_headers: NotificationHeaders,
  ) -> Result<HeaderMap, error::Error> {
    let mut headers = HeaderMap::new();

    headers.insert(
      reqwest::header::CONTENT_TYPE,
      HeaderValue::from_static("application/json"),
    );

    let bearer = self.token.get_bearer().await?;
    let token = format!("bearer {bearer}");
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&token)?);

    if let Some(apns_topic) = &notif_headers.apns_topic {
      headers.insert("apns-topic", HeaderValue::from_str(apns_topic)?);
    }

    if let Some(apns_id) = &notif_headers.apns_id {
      headers.insert("apns-id", HeaderValue::from_str(apns_id)?);
    }

    if let Some(push_type) = &notif_headers.apns_push_type {
      let push_type_str = match push_type {
        PushType::Alert => "alert",
        PushType::Background => "background",
        PushType::Location => "location",
        PushType::Voip => "voip",
        PushType::Complication => "complication",
        PushType::FileProvider => "fileprovider",
        PushType::Mdm => "mdm",
        PushType::LiveActivity => "live",
        PushType::PushToTalk => "pushtotalk",
      };
      headers.insert("apns-push-type", HeaderValue::from_static(push_type_str));
    }

    if let Some(expiration) = notif_headers.apns_expiration {
      headers.insert("apns-expiration", HeaderValue::from(expiration));
    }

    if let Some(priority) = notif_headers.apns_priority {
      headers.insert("apns-priority", HeaderValue::from(priority));
    }

    if let Some(collapse_id) = &notif_headers.apns_collapse_id {
      headers.insert("apns-collapse-id", HeaderValue::from_str(collapse_id)?);
    }

    Ok(headers)
  }

  fn get_endpoint(&self) -> &'static str {
    if self.is_prod {
      return "api.push.apple.com";
    }
    "api.development.push.apple.com"
  }

  pub async fn send(&self, notif: APNsNotif) -> Result<(), error::Error> {
    debug!("Sending APNs notif to {}", notif.device_token);

    let headers = self.build_headers(notif.headers.clone()).await?;

    let url = format!(
      "https://{}/3/device/{}",
      self.get_endpoint(),
      notif.device_token
    );

    let response = self
      .http2_client
      .post(url)
      .headers(headers.clone())
      .body(notif.payload)
      .send()
      .await?;

    match response.status() {
      StatusCode::OK => Ok(()),
      _ => {
        let error_body: ErrorBody = response.json().await?;

        if !error_body.reason.should_invalidate_token() {
          error!(
            errorType = error_types::APNS_ERROR,
            "Failed sending APNs notification to: {}. Body: {}",
            notif.device_token,
            error_body,
          );
        }

        Err(ResponseError(error_body))
      }
    }
  }
}
