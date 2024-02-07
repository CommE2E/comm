//! Search Request Messages sent by Client to Identity Search via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct IdentitySearchPrefix {
  pub prefix: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum IdentitySearchMethod {
  IdentitySearchPrefix(IdentitySearchPrefix),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct IdentitySearchQuery {
  pub search_method: IdentitySearchMethod,
}
