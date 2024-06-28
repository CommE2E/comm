use crate::notifs::apns::config::APNsConfig;
use crate::notifs::apns::headers::{NotificationHeaders, PushType};
use crate::notifs::apns::token::APNsToken;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use std::time::Duration;
pub mod config;
pub mod error;
mod headers;
mod response;
pub mod token;

#[derive(Clone)]
pub struct APNsClient {
  http2_client: reqwest::Client,
  token: APNsToken,
  is_prod: bool,
}

impl APNsClient {
  pub fn new(config: &APNsConfig) -> Result<Self, error::Error> {
    let token_ttl = Duration::from_secs(60 * 55);
    let token = APNsToken::new(config, token_ttl)?;

    let http2_client = reqwest::Client::builder()
      .http2_prior_knowledge()
      .http2_keep_alive_interval(Some(Duration::from_secs(5)))
      .http2_keep_alive_while_idle(true)
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
}
