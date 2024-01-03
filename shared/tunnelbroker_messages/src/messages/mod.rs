//! Messages sent between Tunnelbroker and a device.

pub mod connection_initialization_response;
pub mod heartbeat;
pub mod keys;
pub mod message_receive_confirmation;
pub mod message_to_device;
pub mod message_to_device_request;
pub mod message_to_device_request_status;
pub mod session;

pub use connection_initialization_response::*;
pub use heartbeat::*;
pub use keys::*;
pub use message_receive_confirmation::*;
pub use message_to_device::*;
pub use message_to_device_request::*;
pub use message_to_device_request_status::*;
pub use session::*;

use serde::{Deserialize, Serialize};

// This file defines types and validation for messages exchanged
// with the Tunnelbroker. The definitions in this file should remain in sync
// with the structures defined in the corresponding
// JavaScript file at `lib/types/tunnelbroker/messages.js`.

// If you edit the definitions in one file,
// please make sure to update the corresponding definitions in the other.

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum Messages {
  ConnectionInitializationMessage(ConnectionInitializationMessage),
  ConnectionInitializationResponse(ConnectionInitializationResponse),
  // MessageToDeviceRequestStatus must be placed before MessageToDeviceRequest.
  // This is due to serde's pattern matching behavior where it prioritizes
  // the first matching pattern it encounters.
  MessageToDeviceRequestStatus(MessageToDeviceRequestStatus),
  MessageToDeviceRequest(MessageToDeviceRequest),
  MessageToDevice(MessageToDevice),
  MessageReceiveConfirmation(MessageReceiveConfirmation),
  Heartbeat(Heartbeat),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum PeerToPeerMessages {
  RefreshKeysRequest(RefreshKeyRequest),
}
