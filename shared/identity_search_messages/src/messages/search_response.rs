//! Search Response Message sent by Identity Search via WebSocket to Client.

//
// This file defines structs and enums for the search response message
// sent from the Identity Search WebSocket server to Client.
// The definitions in this file should remain in sync
// with the types and validators defined in the corresponding JavaScript file at
// `lib/types/identity-search/search-response-types.js`.
//
// If you edit the definitions in one file,
// please make sure to update the corresponding definitions in the other.
//
//

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Failure {
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
pub struct SearchResult {
  pub id: String,
  pub hits: Vec<IdentitySearchUser>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SearchResponse {
  Success(SearchResult),
  Error(Failure),
}
