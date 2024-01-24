//! Messages sent from client to Identity Search Server

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
}
