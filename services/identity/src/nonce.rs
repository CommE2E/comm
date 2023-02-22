use chrono::{DateTime, Utc};
use rand::{
  distributions::{Alphanumeric, DistString},
  CryptoRng, Rng,
};

use crate::constants::NONCE_LENGTH;

pub fn generate_nonce_data(rng: &mut (impl Rng + CryptoRng)) -> NonceData {
  NonceData {
    nonce: Alphanumeric.sample_string(rng, NONCE_LENGTH),
    created: Utc::now(),
  }
}

#[derive(Clone)]
pub struct NonceData {
  pub nonce: String,
  pub created: DateTime<Utc>,
}
