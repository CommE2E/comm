//! Search Result Messages sent by Identity Search via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct IdentitySearchUser {
  #[serde(rename = "userID")]
  pub user_id: String,
  pub username: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub struct SearchResult {
  pub hits: Vec<IdentitySearchUser>,
}
