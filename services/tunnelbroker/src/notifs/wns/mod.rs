use crate::constants::{error_types, PUSH_SERVICE_REQUEST_TIMEOUT};
use crate::notifs::wns::config::WNSConfig;
use error::WNSTokenError;
use reqwest::StatusCode;
use response::WNSErrorResponse;
use std::{
  sync::{Arc, RwLock},
  time::{Duration, SystemTime},
};

pub mod config;
pub mod error;
pub mod response;

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
    let http_client = reqwest::Client::builder()
      .timeout(PUSH_SERVICE_REQUEST_TIMEOUT)
      .build()?;
    Ok(WNSClient {
      http_client,
      config: config.clone(),
      access_token: Arc::new(RwLock::new(None)),
    })
  }

  pub async fn send(&self, notif: WNSNotif) -> Result<(), error::Error> {
    let wns_access_token = self.get_wns_token().await?;

    let url = notif.device_token;

    // Send the notification
    let response = self
      .http_client
      .post(&url)
      .header("Content-Type", "application/octet-stream")
      .header("X-WNS-Type", "wns/raw")
      .bearer_auth(wns_access_token)
      .body(notif.payload)
      .send()
      .await?;

    match response.status() {
      StatusCode::OK => {
        tracing::debug!("Successfully sent WNS notif to {}", &url);
        Ok(())
      }
      error_status => {
        let body = response
          .text()
          .await
          .unwrap_or_else(|error| format!("Error occurred: {}", error));
        let wns_error =
          WNSErrorResponse::from_status(error_status, body.clone());

        if !wns_error.should_invalidate_token() {
          tracing::error!(
            errorType = error_types::WNS_ERROR,
            "Failed sending WNS notification to: {}. Status: {}. Body: {}",
            &url,
            error_status,
            body
          );
        }

        Err(error::Error::WNSNotification(wns_error))
      }
    }
  }

  pub async fn get_wns_token(&self) -> Result<String, error::Error> {
    const EXPIRY_WINDOW: Duration = Duration::from_secs(10);

    {
      let read_guard = self
        .access_token
        .read()
        .map_err(|_| error::Error::ReadLock)?;
      if let Some(ref token) = *read_guard {
        if token.expires >= SystemTime::now() - EXPIRY_WINDOW {
          return Ok(token.token.clone());
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
      tracing::error!(
        errorType = error_types::WNS_ERROR,
        status,
        "Failure when getting the WNS token: {}",
        body
      );
      return Err(error::Error::WNSToken(WNSTokenError::Unknown(status)));
    }

    let response_json: serde_json::Value = response.json().await?;
    let token = response_json["access_token"]
      .as_str()
      .ok_or(error::Error::WNSToken(WNSTokenError::TokenNotFound))?
      .to_string();
    let expires_in = response_json["expires_in"]
      .as_u64()
      .ok_or(error::Error::WNSToken(WNSTokenError::ExpiryNotFound))?;

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
    Ok(token)
  }
}
