use chrono::{DateTime, Utc};
use rand::{
  distributions::{Alphanumeric, DistString},
  CryptoRng, Rng,
};

use crate::constants::ACCESS_TOKEN_LENGTH;

#[derive(Clone)]
pub enum AuthType {
  Password,
  Wallet,
}

#[derive(Clone)]
pub struct AccessTokenData {
  pub user_id: String,
  pub signing_public_key: String,
  pub access_token: String,
  pub created: DateTime<Utc>,
  pub auth_type: AuthType,
  pub valid: bool,
}

impl AccessTokenData {
  pub fn new(
    user_id: String,
    signing_public_key: String,
    auth_type: AuthType,
    rng: &mut (impl Rng + CryptoRng),
  ) -> Self {
    AccessTokenData {
      user_id,
      signing_public_key,
      access_token: Alphanumeric.sample_string(rng, ACCESS_TOKEN_LENGTH),
      created: Utc::now(),
      auth_type,
      valid: true,
    }
  }
}
