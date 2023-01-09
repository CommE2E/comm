use rand::{distributions::DistString, CryptoRng, Rng};
use uuid::Uuid;

use crate::constants::ID_SEPARATOR;

/// Generates a blob `holder` string used to store backup/log data
/// in Blob service
pub fn generate_blob_holder(
  blob_hash: &str,
  backup_id: &str,
  resource_id: Option<&str>,
) -> String {
  format!(
    "{backup_id}{sep}{resource_id}{sep}{blob_hash}{sep}{uuid}",
    backup_id = backup_id,
    resource_id = resource_id.unwrap_or_default(),
    blob_hash = blob_hash,
    sep = ID_SEPARATOR,
    uuid = Uuid::new_v4()
  )
}

pub fn generate_random_string(
  length: usize,
  rng: &mut (impl Rng + CryptoRng),
) -> String {
  rand::distributions::Alphanumeric.sample_string(rng, length)
}
