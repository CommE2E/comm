use crate::notifs::fcm::config::FCMConfig;

pub mod config;
mod error;

#[derive(Clone)]
pub struct FCMClient {
  http_client: reqwest::Client,
  config: FCMConfig,
}

impl FCMClient {
  pub fn new(config: &FCMConfig) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder().build()?;
    Ok(FCMClient {
      http_client,
      config: config.clone(),
    })
  }
}
