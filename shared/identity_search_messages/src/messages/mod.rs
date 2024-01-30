//! Messages sent between Client and Identity Search Server via WebSocket.

//
// This file defines structs and enums for messages sent
// to Identity Search WebSocket server and messages sent to Client.
// The definitions in this file should remain in sync
// with the types and validators defined in the corresponding
// JavaScript file at `lib/types/identity-search/messages.js`.
//
// If you edit the definitions in one file,
// please make sure to update the corresponding definitions in the other.
//
//

pub mod auth_messages;
pub mod search_query;
pub mod search_response;

pub use auth_messages::*;
pub use search_query::*;
pub use search_response::*;

use serde::{Deserialize, Serialize};
pub use websocket_messages::{
  ConnectionInitializationResponse, ConnectionInitializationStatus, Heartbeat,
};

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessagesToClient {
  ConnectionInitializationResponse(ConnectionInitializationResponse),
  SearchResponse(SearchResponse),
  Heartbeat(Heartbeat),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessagesToServer {
  AuthMessage(AuthMessage),
  SearchQuery(SearchQuery),
  Heartbeat(Heartbeat),
}
