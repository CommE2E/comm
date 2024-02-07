//! Search Result Messages sent by Identity Search via WebSocket.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct IdentitySearchFailure {
  pub id: String,
  pub error: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdentitySearchUser {
  #[serde(rename = "userID")]
  pub user_id: String,
  pub username: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdentitySearchResult {
  pub id: String,
  pub hits: Vec<IdentitySearchUser>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum IdentitySearchResponse {
  Success(IdentitySearchResult),
  Error(IdentitySearchFailure),
}
