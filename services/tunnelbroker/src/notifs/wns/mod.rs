use crate::notifs::wns::config::WNSConfig;
use std::{
  sync::{Arc, RwLock},
  time::{Duration, SystemTime},
};

pub mod config;
mod error;

#[derive(Debug, Clone)]
pub struct WNSAccessToken {
  token: String,
  expires: SystemTime,
}

#[derive(Clone)]
pub struct WNSClient {
  http_client: reqwest::Client,
  config: WNSConfig,
  access_token: Arc<RwLock<Option<WNSAccessToken>>>,
}

impl WNSClient {
  pub fn new(config: &WNSConfig) -> Result<Self, error::Error> {
    let http_client = reqwest::Client::builder().build()?;
    Ok(WNSClient {
      http_client,
      config: config.clone(),
      access_token: Arc::new(RwLock::new(None)),
    })
  }

  pub async fn get_wns_token(
    &mut self,
  ) -> Result<Option<String>, error::Error> {
    const EXPIRY_WINDOW: Duration = Duration::from_secs(10);

    {
      let read_guard = self
        .access_token
        .read()
        .map_err(|_| error::Error::ReadLock)?;
      if let Some(ref token) = *read_guard {
        if token.expires >= SystemTime::now() - EXPIRY_WINDOW {
          return Ok(Some(token.token.clone()));
        }
      }
    }

    let params = [
      ("grant_type", "client_credentials"),
      ("client_id", &self.config.app_id),
      ("client_secret", &self.config.secret),
      ("scope", "https://wns.windows.com/.default"),
    ];

    let url = format!(
      "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
      self.config.tenant_id
    );

    let response = self.http_client.post(&url).form(&params).send().await?;

    if !response.status().is_success() {
      let status = response.status().to_string();
      let body = response
        .text()
        .await
        .unwrap_or_else(|_| String::from("<failed to read body>"));
      tracing::error!(status, "Failure when getting the WNS token: {}", body);
      return Ok(None);
    }

    let response_json: serde_json::Value = response.json().await?;
    let token = response_json["access_token"]
      .as_str()
      .ok_or(error::Error::TokenNotFound)?
      .to_string();
    let expires_in = response_json["expires_in"]
      .as_u64()
      .ok_or(error::Error::ExpiryNotFound)?;

    let expires = SystemTime::now() + Duration::from_secs(expires_in);

    {
      let mut write_guard = self
        .access_token
        .write()
        .map_err(|_| error::Error::WriteLock)?;
      *write_guard = Some(WNSAccessToken {
        token: token.clone(),
        expires,
      });
    }
    Ok(Some(token))
  }
}
