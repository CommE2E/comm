use crate::notifs::fcm::config::FCMConfig;
use crate::notifs::fcm::error::Error;
use crate::notifs::fcm::error::Error::FCMTokenNotInitialized;
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::debug;

#[derive(Debug, Clone, Deserialize)]
struct FCMAccessTokenResponse {
  access_token: String,
  token_type: String,
  expires_in: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct FCMAccessToken {
  access_token: String,
  token_type: String,
  expiration_time: u64,
}

#[derive(Debug, Clone)]
pub struct FCMToken {
  token: Arc<RwLock<Option<FCMAccessToken>>>,
  config: FCMConfig,
  validity_duration: Duration,
}

impl FCMToken {
  pub fn new(config: &FCMConfig, token_ttl: Duration) -> Result<Self, Error> {
    Ok(FCMToken {
      token: Arc::new(RwLock::new(None)),
      config: config.clone(),
      validity_duration: token_ttl,
    })
  }

  pub async fn get_auth_bearer(&self) -> Result<String, Error> {
    let bearer = self.token.read().await;
    match &*bearer {
      Some(token) => Ok(format!("{} {}", token.token_type, token.access_token)),
      None => Err(FCMTokenNotInitialized),
    }
  }

  fn get_jwt_token(&self, created_at: u64) -> Result<String, Error> {
    let exp = created_at + self.validity_duration.as_secs();
    let payload = json!({
      // The email address of the service account.
      "iss": self.config.client_email,
      // 	A descriptor of the intended target of the assertion.
      "aud": self.config.token_uri,
      // The time the assertion was issued.
      "iat": created_at,
      // The expiration time of the assertion.
      // This value has a maximum of 1 hour after the issued time.
      "exp": exp,
      // A space-delimited list of the permissions that the application
      // requests.
      "scope": "https://www.googleapis.com/auth/firebase.messaging",
    });

    debug!("Encoding JWT token for FCM, created at: {}", created_at);

    let header = Header::new(Algorithm::RS256);
    let encoding_key =
      EncodingKey::from_rsa_pem(self.config.private_key.as_bytes()).unwrap();
    let token = jsonwebtoken::encode(&header, &payload, &encoding_key)?;
    Ok(token)
  }

  async fn get_fcm_access_token(
    &self,
    jwt_token: String,
  ) -> Result<FCMAccessTokenResponse, Error> {
    let response = reqwest::Client::new()
      .post(self.config.token_uri.clone())
      .form(&[
        ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
        ("assertion", &jwt_token),
      ])
      .send()
      .await?;

    let access_token = response.json::<FCMAccessTokenResponse>().await?;
    Ok(access_token)
  }
}
