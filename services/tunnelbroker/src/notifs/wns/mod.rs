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

#[derive(Debug, Clone)]
pub struct WNSNotif {
  pub device_token: String,
  pub payload: String,
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

  pub async fn send(&self, notif: WNSNotif) -> Result<(), error::Error> {
    let token = self.get_wns_token().await?.ok_or(
      error::WNSNotificationError::Unknown(
        "Failed to get WNS token".to_string(),
      ),
    )?;

    let url = format!(
      "https://dm3p.notify.windows.com/?token={}",
      notif.device_token
    );

    // Send the notification
    let response = self
      .http_client
      .post(&url)
      .header("Content-Type", "application/octet-stream")
      .header("X-WNS-Type", "wns/raw")
      .bearer_auth(token)
      .body(notif.payload)
      .send()
      .await?;

    if !response.status().is_success() {
      return Err(
        error::WNSNotificationError::Unknown(
          response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string()),
        )
        .into(),
      );
    }

    response
      .headers()
      .get("X-WNS-MSG-ID")
      .and_then(|val| val.to_str().ok())
      .ok_or(error::Error::MissingWNSID)?;

    Ok(())
  }

  pub async fn get_wns_token(&self) -> Result<Option<String>, error::Error> {
    let expiry_window_in_secs = 10;

    {
      let read_guard = self
        .access_token
        .read()
        .map_err(|_| error::Error::ReadLock)?;
      if let Some(ref token) = *read_guard {
        if token.expires
          >= SystemTime::now() - Duration::from_secs(expiry_window_in_secs)
        {
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
      tracing::error!("Failure when getting the WNS token: {:?}", response);
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
