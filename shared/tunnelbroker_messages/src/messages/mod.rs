// Messages sent between tunnelbroker and a device
pub mod keys;
pub mod session;

pub use keys::*;
pub use session::*;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum Messages {
  RefreshKeysRequest(RefreshKeyRequest),
  SessionRequest(ConnectionInitializationMessage),
}
