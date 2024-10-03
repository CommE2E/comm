use crate::constants::FCM_ACCESS_TOKEN_GENERATION_THRESHOLD;
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

  pub async fn get_auth_bearer(
    &self,
    force_regenerate: bool,
  ) -> Result<String, Error> {
    if force_regenerate || self.fcm_token_needs_generation().await {
      self.generate_fcm_token().await?;
    }

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

  async fn fcm_token_needs_generation(&self) -> bool {
    let token = self.token.read().await;
    match &*token {
      None => true,
      Some(token) => {
        get_time() - FCM_ACCESS_TOKEN_GENERATION_THRESHOLD
          >= token.expiration_time
      }
    }
  }
  async fn generate_fcm_token(&self) -> Result<(), Error> {
    debug!("Generating FCM access token");
    let mut token = self.token.write().await;

    let created_at = get_time();
    let new_jwt_token = self.get_jwt_token(created_at)?;
    let access_token_response =
      self.get_fcm_access_token(new_jwt_token).await?;

    *token = Some(FCMAccessToken {
      access_token: access_token_response.access_token,
      token_type: access_token_response.token_type,
      expiration_time: created_at + access_token_response.expires_in,
    });

    Ok(())
  }
}

fn get_time() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs()
}
