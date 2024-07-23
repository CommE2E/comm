// @flow

import type { TUnion } from 'tcomb';
import t from 'tcomb';

import { type MessageReceiveConfirmation } from './message-receive-confirmation-types.js';
import {
  type MessageToDeviceRequestStatus,
  messageToDeviceRequestStatusValidator,
} from './message-to-device-request-status-types.js';
import { type MessageToDeviceRequest } from './message-to-device-request-types.js';
import {
  type MessageToDevice,
  messageToDeviceValidator,
} from './message-to-device-types.js';
import { type MessageToTunnelbrokerRequest } from './message-to-tunnelbroker-request-types.js';
import {
  type TunnelbrokerAPNsNotif,
  type TunnelbrokerFCMNotif,
} from './notif-types.js';
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
  MESSAGE_TO_DEVICE_REQUEST: 'MessageToDeviceRequest',
  MESSAGE_RECEIVE_CONFIRMATION: 'MessageReceiveConfirmation',
  MESSAGE_TO_TUNNELBROKER_REQUEST: 'MessageToTunnelbrokerRequest',
  HEARTBEAT: 'Heartbeat',
});

export type DeviceToTunnelbrokerMessage =
  | ConnectionInitializationMessage
  | AnonymousInitializationMessage
  | TunnelbrokerAPNsNotif
  | TunnelbrokerFCMNotif
  | MessageToDeviceRequest
  | MessageReceiveConfirmation
  | MessageToTunnelbrokerRequest
  | Heartbeat;

// Messages sent from Tunnelbroker to Device.
export const tunnelbrokerToDeviceMessageTypes = Object.freeze({
  CONNECTION_INITIALIZATION_RESPONSE: 'ConnectionInitializationResponse',
  MESSAGE_TO_DEVICE_REQUEST_STATUS: 'MessageToDeviceRequestStatus',
  MESSAGE_TO_DEVICE: 'MessageToDevice',
  HEARTBEAT: 'Heartbeat',
});

export type TunnelbrokerToDeviceMessage =
  | ConnectionInitializationResponse
  | MessageToDeviceRequestStatus
  | MessageToDevice
  | Heartbeat;

export const tunnelbrokerToDeviceMessageValidator: TUnion<TunnelbrokerToDeviceMessage> =
  t.union([
    connectionInitializationResponseValidator,
    messageToDeviceRequestStatusValidator,
    messageToDeviceValidator,
    heartbeatValidator,
  ]);
