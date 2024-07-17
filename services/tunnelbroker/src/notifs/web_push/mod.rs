use crate::notifs::web_push::config::WebPushConfig;

pub mod config;
mod error;

#[derive(Clone)]
pub struct WebPushClient {
  http_client: reqwest::Client,
  config: WebPushConfig,
}

impl WebPushClient {
  pub fn new(config: &WebPushConfig) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder().build()?;
    Ok(WebPushClient {
      http_client,
      config: config.clone(),
    })
  }
}
