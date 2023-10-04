// Messages sent between Tunnelbroker and a device
pub mod keys;
pub mod message_to_device;
pub mod message_to_device_request;
pub mod send_confirmation;
pub mod session;

pub use keys::*;
pub use message_to_device::*;
pub use message_to_device_request::*;
pub use send_confirmation::*;
pub use session::*;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum Messages {
  RefreshKeysRequest(RefreshKeyRequest),
  ConnectionInitializationMessage(ConnectionInitializationMessage),
  MessageToDeviceRequest(MessageToDeviceRequest),
  MessageToDevice(MessageToDevice),
  SendConfirmation(SendConfirmation),
}
