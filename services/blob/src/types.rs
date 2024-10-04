use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BlobHashAndHolder {
  pub blob_hash: String,
  pub holder: String,
}
