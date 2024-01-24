//! Messages sent from Identity Search server to client

pub mod auth_messages;

pub use auth_messages::*;

use serde::{Deserialize, Serialize};
pub use websocket_messages::{
  ConnectionInitializationResponse, ConnectionInitializationStatus, Heartbeat,
};

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Messages {
  AuthMessage(AuthMessage),
  Heartbeat(Heartbeat),
  ConnectionInitializationStatus(ConnectionInitializationStatus),
  ConnectionInitializationResponse(ConnectionInitializationResponse),
}
