//! Auth Message sent by Client to authenticate with Identity Search Server via WebSocket.

//
// This file defines structs and enums for the auth message sent
// from the Client to the Identity Search WebSocket server.
// The definitions in this file should remain in sync
// with the types and validators defined in the corresponding
// JavaScript file at `lib/types/identity-search/auth-message-types.js`.
//
// If you edit the definitions in one file,
// please make sure to update the corresponding definitions in the other.
//
//

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub struct IdentitySearchAuthMessage {
  #[serde(rename = "userID")]
  pub user_id: String,
  #[serde(rename = "deviceID")]
  pub device_id: String,
  pub access_token: String,
}
