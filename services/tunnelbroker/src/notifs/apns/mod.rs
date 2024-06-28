use crate::notifs::apns::config::APNsConfig;
use crate::notifs::apns::token::APNsToken;
use std::time::Duration;
pub mod config;
pub mod error;
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
}
