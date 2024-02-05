//! Messages sent between Client and Identity Search Server

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
  IdentitySearchResponse(IdentitySearchResponse),
  Heartbeat(Heartbeat),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessagesToServer {
  IdentitySearchAuthMessage(IdentitySearchAuthMessage),
  IdentitySearchQuery(IdentitySearchQuery),
  Heartbeat(Heartbeat),
}
