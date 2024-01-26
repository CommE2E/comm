//! Search Result Messages sent by Identity Search via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct User {
  #[serde(rename = "userID")]
  pub user_id: String,
  pub username: String,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub struct SearchResult {
  pub payload: Vec<User>,
}
