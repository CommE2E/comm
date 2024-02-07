//! Search Request Messages sent by Client to Identity Search via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Prefix {
  pub prefix: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SearchMethod {
  Prefix(Prefix),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct SearchQuery {
  pub id: String,
  pub search_method: SearchMethod,
}
