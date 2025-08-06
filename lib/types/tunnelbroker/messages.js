// @flow

import type { TUnion } from 'tcomb';
import t from 'tcomb';

import {
  messageToDeviceRequestStatusValidator,
  type DeviceToTunnelbrokerRequestStatus,
} from './device-to-tunnelbroker-request-status-types.js';
import { farcasterAPIResponseValidator } from './farcaster-messages-types.js';
import type {
  FarcasterAPIRequest,
  FarcasterAPIResponse,
} from './farcaster-messages-types.js';
import { type MessageReceiveConfirmation } from './message-receive-confirmation-types.js';
import { type MessageToDeviceRequest } from './message-to-device-request-types.js';
import {
  type MessageToDevice,
  messageToDeviceValidator,
} from './message-to-device-types.js';
import { type MessageToTunnelbrokerRequest } from './message-to-tunnelbroker-request-types.js';
import { type TunnelbrokerNotif } from './notif-types.js';
import {
  type AnonymousInitializationMessage,
  type ConnectionInitializationMessage,
} from './session-types.js';
import {
  type ConnectionInitializationResponse,
  connectionInitializationResponseValidator,
} from '../websocket/connection-initialization-response-types.js';
import {
  type Heartbeat,
  heartbeatValidator,
} from '../websocket/heartbeat-types.js';

/*
 * This file defines types and validation for messages exchanged
 * with the Tunnelbroker. The definitions in this file should remain in sync
 * with the structures defined in the corresponding
 * Rust file at `shared/tunnelbroker_messages/src/messages/mod.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 *
 */

// Messages sent from Device to Tunnelbroker.
export const deviceToTunnelbrokerMessageTypes = Object.freeze({
  CONNECTION_INITIALIZATION_MESSAGE: 'ConnectionInitializationMessage',
  ANONYMOUS_INITIALIZATION_MESSAGE: 'AnonymousInitializationMessage',
  TUNNELBROKER_APNS_NOTIF: 'APNsNotif',
  TUNNELBROKER_FCM_NOTIF: 'FCMNotif',
  TUNNELBROKER_WEB_PUSH_NOTIF: 'WebPushNotif',
  TUNNELBROKER_WNS_NOTIF: 'WNSNotif',
  MESSAGE_TO_DEVICE_REQUEST: 'MessageToDeviceRequest',
  MESSAGE_RECEIVE_CONFIRMATION: 'MessageReceiveConfirmation',
  MESSAGE_TO_TUNNELBROKER_REQUEST: 'MessageToTunnelbrokerRequest',
  FARCASTER_API_REQUEST: 'FarcasterAPIRequest',
  HEARTBEAT: 'Heartbeat',
});

export type DeviceToTunnelbrokerMessage =
  | ConnectionInitializationMessage
  | AnonymousInitializationMessage
  | TunnelbrokerNotif
  | MessageToDeviceRequest
  | MessageReceiveConfirmation
  | MessageToTunnelbrokerRequest
  | FarcasterAPIRequest
  | Heartbeat;

// Types having `clientMessageID` or `requestID` prop.
// When using this type, it is possible to use Promise abstraction,
// and await sending a message until Tunnelbroker responds that
// the request was processed.
export type DeviceToTunnelbrokerRequest =
  | TunnelbrokerNotif
  | MessageToDeviceRequest
  | MessageToTunnelbrokerRequest
  | FarcasterAPIRequest;

// Messages sent from Tunnelbroker to Device.
export const tunnelbrokerToDeviceMessageTypes = Object.freeze({
  CONNECTION_INITIALIZATION_RESPONSE: 'ConnectionInitializationResponse',
  DEVICE_TO_TUNNELBROKER_REQUEST_STATUS: 'MessageToDeviceRequestStatus',
  MESSAGE_TO_DEVICE: 'MessageToDevice',
  FARCASTER_API_RESPONSE: 'FarcasterAPIResponse',
  HEARTBEAT: 'Heartbeat',
});

export type TunnelbrokerToDeviceMessage =
  | ConnectionInitializationResponse
  | DeviceToTunnelbrokerRequestStatus
  | MessageToDevice
  | FarcasterAPIResponse
  | Heartbeat;

export const tunnelbrokerToDeviceMessageValidator: TUnion<TunnelbrokerToDeviceMessage> =
  t.union([
    connectionInitializationResponseValidator,
    messageToDeviceRequestStatusValidator,
    messageToDeviceValidator,
    farcasterAPIResponseValidator,
    heartbeatValidator,
  ]);
