// Messages sent between Tunnelbroker and a device
pub mod keys;
pub mod message_to_device;
pub mod session;

pub use keys::*;
pub use message_to_device::*;
pub use session::*;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum Messages {
  RefreshKeysRequest(RefreshKeyRequest),
  ConnectionInitializationMessage(ConnectionInitializationMessage),
  MessageToDevice(MessageToDevice),
}
