use chrono::{DateTime, Utc};
use rand::{
  distributions::{Alphanumeric, DistString},
  CryptoRng, Rng,
};

use crate::{
  client_service::handle_db_error,
  constants::{tonic_status_messages, NONCE_TTL_DURATION},
};
use crate::{constants::NONCE_LENGTH, grpc_services::shared::HasClient};

pub fn generate_nonce_data(rng: &mut (impl Rng + CryptoRng)) -> NonceData {
  let nonce = Alphanumeric.sample_string(rng, NONCE_LENGTH);
  let created = Utc::now();
  let expiration_time = created + NONCE_TTL_DURATION;
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

impl NonceData {
  pub fn is_expired(&self) -> bool {
    Utc::now() > self.expiration_time
  }
}

#[tonic::async_trait]
pub trait NonceVerification {
  async fn verify_and_remove_nonce(
    &self,
    nonce: &str,
  ) -> Result<(), tonic::Status>;
}

#[tonic::async_trait]
impl<T: HasClient + Sync> NonceVerification for T {
  async fn verify_and_remove_nonce(
    &self,
    nonce: &str,
  ) -> Result<(), tonic::Status> {
    match self
      .client()
      .get_nonce_from_nonces_table(nonce)
      .await
      .map_err(handle_db_error)?
    {
      None => {
        return Err(tonic::Status::invalid_argument(
          tonic_status_messages::INVALID_NONCE,
        ))
      }
      Some(nonce) if nonce.is_expired() => {
        // we don't need to remove the nonce from the table here
        // because the DynamoDB TTL will take care of it
        return Err(tonic::Status::aborted(
          tonic_status_messages::NONCE_EXPIRED,
        ));
      }
      Some(nonce_data) => self
        .client()
        .remove_nonce_from_nonces_table(&nonce_data.nonce)
        .await
        .map_err(handle_db_error)?,
    };
    Ok(())
  }
}
