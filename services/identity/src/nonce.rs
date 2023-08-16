use chrono::{DateTime, Duration, Utc};
use rand::{
  distributions::{Alphanumeric, DistString},
  CryptoRng, Rng,
};

use crate::constants::NONCE_LENGTH;
use crate::constants::NONCE_TTL_DURATION;

pub fn generate_nonce_data(rng: &mut (impl Rng + CryptoRng)) -> NonceData {
  let nonce = Alphanumeric.sample_string(rng, NONCE_LENGTH);
  let created = Utc::now();
  let expiration_time = created + Duration::minutes(NONCE_TTL_DURATION);
  NonceData {
    nonce,
    created,
    expiration_time,
  }
}

#[derive(Clone)]
pub struct NonceData {
  pub nonce: String,
  pub created: DateTime<Utc>,
  pub expiration_time: DateTime<Utc>,
}
