use chrono::{DateTime, Utc};
use comm_lib::crypto::siwe::is_valid_ethereum_address;
use rand::{
  distributions::{Alphanumeric, DistString},
  CryptoRng, Rng,
};

use crate::{constants::ACCESS_TOKEN_LENGTH, ddb_utils::Identifier};

#[derive(Clone, Eq, PartialEq)]
pub enum AuthType {
  Password,
  Wallet,
}

impl AuthType {
  pub fn from_user_identifier(user_identifier: &str) -> Self {
    if is_valid_ethereum_address(user_identifier) {
      Self::Wallet
    } else {
      Self::Password
    }
  }
}

impl From<Identifier> for AuthType {
  fn from(id: Identifier) -> Self {
    match id {
      Identifier::Username(_) => AuthType::Password,
      Identifier::WalletAddress(_) => AuthType::Wallet,
    }
  }
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
  pub fn with_created_time(
    user_id: String,
    signing_public_key: String,
    creation_time: DateTime<Utc>,
    auth_type: AuthType,
    rng: &mut (impl Rng + CryptoRng),
  ) -> Self {
    AccessTokenData {
      user_id,
      signing_public_key,
      access_token: Alphanumeric.sample_string(rng, ACCESS_TOKEN_LENGTH),
      created: creation_time,
      auth_type,
      valid: true,
    }
  }

  pub fn is_valid(&self) -> bool {
    self.valid
  }
}
