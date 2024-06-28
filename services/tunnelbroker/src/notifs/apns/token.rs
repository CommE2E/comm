use crate::notifs::apns::config::APNsConfig;
use crate::notifs::apns::error::Error;
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
struct JWTToken {
  token: String,
  created_at: i64,
}

#[derive(Debug, Clone)]
pub struct APNsToken {
  jwt_token: Arc<RwLock<JWTToken>>,
  key: String,
  key_id: String,
  team_id: String,
  validity_duration: Duration,
}

impl APNsToken {
  pub fn new(config: &APNsConfig, token_ttl: Duration) -> Result<Self, Error> {
    let created_at = get_time();
    let token = Self::create_signature(
      &config.key,
      &config.key_id,
      &config.team_id,
      created_at,
    )?;

    Ok(APNsToken {
      jwt_token: Arc::new(RwLock::new(JWTToken { token, created_at })),
      key: config.key.clone(),
      key_id: config.key_id.clone(),
      team_id: config.team_id.clone(),
      validity_duration: token_ttl,
    })
  }

  pub async fn get_bearer(&self) -> Result<String, Error> {
    if self.is_expired().await {
      self.renew().await?;
    }

    let bearer = self.jwt_token.read().await;
    Ok(bearer.token.clone())
  }

  async fn renew(&self) -> Result<(), Error> {
    let created_at = get_time();

    let mut jwt_token = self.jwt_token.write().await;
    *jwt_token = JWTToken {
      token: Self::create_signature(
        &self.key,
        &self.key_id,
        &self.team_id,
        created_at,
      )?,
      created_at,
    };

    Ok(())
  }

  fn create_signature(
    key: &str,
    key_id: &str,
    team_id: &str,
    created_at: i64,
  ) -> Result<String, Error> {
    let payload = json!({
        "iat": created_at,
        "iss": team_id
    });

    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some(key_id.to_owned());

    let encoding_key = EncodingKey::from_ec_pem(key.as_bytes()).unwrap();
    let token = jsonwebtoken::encode(&header, &payload, &encoding_key)?;
    Ok(token)
  }

  async fn is_expired(&self) -> bool {
    let token = self.jwt_token.read().await;
    let duration = get_time() - token.created_at;
    duration >= self.validity_duration.as_secs() as i64
  }
}

fn get_time() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs() as i64
}

#[cfg(test)]
mod tests {
  use super::*;

  const PRIVATE_KEY: &str = "
  -----BEGIN PRIVATE KEY-----
    MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgnOrbqKai/asjilSx
    sy8bexWmNl6e1SfXpIaMyrAdkragCgYIKoZIzj0DAQehRANCAARU3bWPHyXrsrMc
    KxZuXQQ3wRz+uxeXSrdAWAt1JADT6Rx9B5lEXc6H/qTuv0y/+6hPuWrCwzNe5rpm
    Y5Pcz+SR
  -----END PRIVATE KEY-----";

  #[tokio::test]
  async fn test_token_caching() {
    let config = APNsConfig {
      key: PRIVATE_KEY.to_string(),
      key_id: "1212121212".to_string(),
      team_id: "ASDFASDFA".to_string(),
      production: false,
    };

    let json_string = serde_json::to_string(&config).unwrap();
    let token = APNsToken::new(&config, Duration::from_secs(100)).unwrap();

    let b1 = token.get_bearer().await.unwrap();
    let b2 = token.get_bearer().await.unwrap();

    assert_eq!(b1, b2);
  }

  #[tokio::test]
  async fn test_token_renew() {
    let config = APNsConfig {
      key: PRIVATE_KEY.to_string(),
      key_id: "1212121212".to_string(),
      team_id: "ASDFASDFA".to_string(),
      production: false,
    };
    let token = APNsToken::new(&config, Duration::from_secs(0)).unwrap();

    let b1 = token.get_bearer().await.unwrap();
    let b2 = token.get_bearer().await.unwrap();

    assert_ne!(b1, b2);
  }
}
