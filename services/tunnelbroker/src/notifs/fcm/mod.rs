use crate::notifs::fcm::config::FCMConfig;
use crate::notifs::fcm::token::FCMToken;
use std::time::Duration;

pub mod config;
mod error;
mod firebase_message;
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
}
