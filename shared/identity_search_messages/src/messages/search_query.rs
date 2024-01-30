//! Search Query Message sent by Client to Identity Search via WebSocket.

//
// This file defines structs and enums for the search query message sent
// from the Client to the Identity Search WebSocket server.
// The definitions in this file should remain in sync
// with the types and validators defined in the corresponding
// JavaScript file at `lib/types/identity-search/search-query-types.js`.
//
// If you edit the definitions in one file,
// please make sure to update the corresponding definitions in the other.
//

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
  pub id: String,
  pub search_method: IdentitySearchMethod,
}
