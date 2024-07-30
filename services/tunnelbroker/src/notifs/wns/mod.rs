use crate::notifs::wns::config::WNSConfig;
use reqwest::StatusCode;
use response::WNSErrorResponse;
use std::{
  sync::{Arc, RwLock},
  time::{Duration, SystemTime},
};

pub mod config;
mod error;
mod response;

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
    let wns_access_token = self
      .get_wns_token()
      .await?
      .ok_or(error::Error::TokenNotFound)?;

    let url = notif.device_token;

    // Send the notification
    let response = self
      .http_client
      .post(&url)
      .header("Content-Type", "application/octet-stream")
      .header("X-WNS-Type", "wns/raw")
      .bearer_auth(wns_access_token.clone())
      .body(notif.payload)
      .send()
      .await?;

    match response.status() {
      StatusCode::OK => {
        tracing::debug!("Successfully sent WNS notif to {}", wns_access_token);
        Ok(())
      }
      error_status => {
        let body = response
          .text()
          .await
          .unwrap_or_else(|error| format!("Error occurred: {}", error));
        tracing::error!(
          "Failed sending FCM notification to: {}. Status: {}. Body: {}",
          wns_access_token,
          error_status,
          body
        );
        let fcm_error = WNSErrorResponse::from_status(error_status, body);
        Err(error::Error::WNSNotification(fcm_error))
      }
    }
  }

  pub async fn get_wns_token(&self) -> Result<Option<String>, error::Error> {
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
