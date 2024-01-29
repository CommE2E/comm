//! Search Request Messages sent by Client to Identity Search via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Prefix {
  pub prefix: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SearchQuery {
  Prefix(Prefix),
}
