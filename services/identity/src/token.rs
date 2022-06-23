use chrono::{DateTime, Utc};
use rand::{
  distributions::{Alphanumeric, DistString},
  CryptoRng, Rng,
};

pub enum AuthType {
  Password,
  Wallet,
}

pub struct AccessTokenData {
  pub user_id: String,
  pub device_id: String,
  pub access_token: String,
  pub created: DateTime<Utc>,
  pub auth_type: AuthType,
  pub valid: bool,
}

impl AccessTokenData {
  pub fn new(
    user_id: String,
    device_id: String,
    auth_type: AuthType,
    rng: &mut (impl Rng + CryptoRng),
  ) -> Self {
    AccessTokenData {
      user_id,
      device_id,
      access_token: Alphanumeric.sample_string(rng, 512),
      created: Utc::now(),
      auth_type,
      valid: true,
    }
  }
}
