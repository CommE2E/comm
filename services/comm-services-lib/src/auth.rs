use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserIdentity {
  #[serde(alias = "userID")]
  user_id: String,
  #[serde(alias = "accessToken")]
  access_token: String,
  #[serde(alias = "signingPublicKey")]
  signing_public_key: String,
}

impl UserIdentity {
  /// Retrieves the Identity Service user ID
  pub fn user_id(&self) -> &str {
    &self.user_id
  }

  /// Gets the access token value, usable in bearer authorization
  ///
  /// # Example
  /// ```rust
  /// reqwest::get(url).beaerer_auth(user.authorization_token()?).send().await?;
  /// ```
  pub fn authorization_token(&self) -> Result<String, serde_json::Error> {
    use base64::Engine;

    let json = serde_json::to_string(self)?;
    let base64_str = base64::prelude::BASE64_STANDARD.encode(json);
    Ok(base64_str)
  }
}
