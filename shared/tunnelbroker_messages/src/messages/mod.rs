//! Messages sent between Tunnelbroker and a device.

pub mod device_list_updated;
pub mod keys;
pub mod message_receive_confirmation;
pub mod message_to_device;
pub mod message_to_device_request;
pub mod message_to_device_request_status;
pub mod message_to_tunnelbroker;
pub mod message_to_tunnelbroker_request;
pub mod notif;
pub mod session;

pub use device_list_updated::*;
pub use keys::*;
pub use message_receive_confirmation::*;
pub use message_to_device::*;
pub use message_to_device_request::*;
pub use message_to_device_request_status::*;
pub use message_to_tunnelbroker::*;
pub use message_to_tunnelbroker_request::*;
pub use session::*;
pub use websocket_messages::{
  ConnectionInitializationResponse, ConnectionInitializationStatus, Heartbeat,
};

use crate::notif::*;
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
  AnonymousInitializationMessage(AnonymousInitializationMessage),
  // MessageToDeviceRequestStatus must be placed before MessageToDeviceRequest.
  // This is due to serde's pattern matching behavior where it prioritizes
  // the first matching pattern it encounters.
  APNsNotif(APNsNotif),
  MessageToDeviceRequestStatus(MessageToDeviceRequestStatus),
  MessageToDeviceRequest(MessageToDeviceRequest),
  MessageToDevice(MessageToDevice),
  MessageReceiveConfirmation(MessageReceiveConfirmation),
  MessageToTunnelbrokerRequest(MessageToTunnelbrokerRequest),
  Heartbeat(Heartbeat),
  IdentityDeviceListUpdated(IdentityDeviceListUpdated),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum PeerToPeerMessages {
  RefreshKeysRequest(RefreshKeyRequest),
  IdentityDeviceListUpdated(IdentityDeviceListUpdated),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum MessageToTunnelbroker {
  SetDeviceToken(SetDeviceToken),
}
