//! Messages sent between Tunnelbroker and a device.

pub mod bad_device_token;
pub mod device_list_updated;
pub mod farcaster;
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

use crate::bad_device_token::BadDeviceToken;
use crate::messages::farcaster::{FarcasterAPIRequest, FarcasterAPIResponse};
use crate::notif::*;
use serde::{Deserialize, Serialize};

// This file defines types and validation for messages exchanged
// with the Tunnelbroker. The definitions in this file should remain in sync
// with the structures defined in the corresponding
// JavaScript file at `lib/types/tunnelbroker/messages.js`.

// If you edit the definitions in one file,
// please make sure to update the corresponding definitions in the other.

// Messages sent from Device to Tunnelbroker.
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum DeviceToTunnelbrokerMessage {
  ConnectionInitializationMessage(ConnectionInitializationMessage),
  AnonymousInitializationMessage(AnonymousInitializationMessage),
  APNsNotif(APNsNotif),
  FCMNotif(FCMNotif),
  WebPushNotif(WebPushNotif),
  WNSNotif(WNSNotif),
  MessageToDeviceRequest(MessageToDeviceRequest),
  MessageReceiveConfirmation(MessageReceiveConfirmation),
  MessageToTunnelbrokerRequest(MessageToTunnelbrokerRequest),
  FarcasterAPIRequest(FarcasterAPIRequest),
  Heartbeat(Heartbeat),
}

// Messages sent from Tunnelbroker to Device.
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum TunnelbrokerToDeviceMessage {
  ConnectionInitializationResponse(ConnectionInitializationResponse),
  DeviceToTunnelbrokerRequestStatus(DeviceToTunnelbrokerRequestStatus),
  FarcasterAPIResponse(FarcasterAPIResponse),
  MessageToDevice(MessageToDevice),
  BadDeviceToken(BadDeviceToken),
  Heartbeat(Heartbeat),
}

// Messages sent from Services (e.g. Identity) to Device.
// This type is sent to a Device as a payload of MessageToDevice.
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum ServiceToDeviceMessages {
  RefreshKeysRequest(RefreshKeyRequest),
  IdentityDeviceListUpdated(IdentityDeviceListUpdated),
  BadDeviceToken(BadDeviceToken),
}

// Messages sent from Device to Tunnelbroker which Tunnelbroker itself should handle.
// This type is sent to a Tunnelbroker as a payload of MessageToTunnelbrokerRequest.
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum MessageToTunnelbroker {
  SetDeviceTokenWithPlatform(SetDeviceTokenWithPlatform),
  SetDeviceToken(SetDeviceToken),
}
