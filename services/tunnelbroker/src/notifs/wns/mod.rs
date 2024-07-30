use crate::notifs::wns::config::WNSConfig;

pub mod config;
mod error;

#[derive(Clone)]
pub struct WNSClient {
  http_client: reqwest::Client,
  config: WNSConfig,
}

impl WNSClient {
  pub fn new(config: &WNSConfig) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder().build()?;
    Ok(WNSClient {
      http_client,
      config: config.clone(),
    })
  }
}
