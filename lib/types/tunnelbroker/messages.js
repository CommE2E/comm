// @flow

import type { TUnion } from 'tcomb';
import t from 'tcomb';

import {
  type MessageReceiveConfirmation,
  messageReceiveConfirmationValidator,
} from './message-receive-confirmation-types.js';
import {
  type MessageToDeviceRequestStatus,
  messageToDeviceRequestStatusValidator,
} from './message-to-device-request-status-types.js';
import {
  type MessageToDeviceRequest,
  messageToDeviceRequestValidator,
} from './message-to-device-request-types.js';
import {
  type MessageToDevice,
  messageToDeviceValidator,
} from './message-to-device-types.js';
import {
  type MessageToTunnelbrokerRequest,
  messageToTunnelbrokerRequestValidator,
} from './message-to-tunnelbroker-request-types.js';
import { type TunnelbrokerAPNsNotif } from './notif-types.js';
import {
  type ConnectionInitializationMessage,
  connectionInitializationMessageValidator,
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

export const tunnelbrokerMessageTypes = Object.freeze({
  CONNECTION_INITIALIZATION_MESSAGE: 'ConnectionInitializationMessage',
  CONNECTION_INITIALIZATION_RESPONSE: 'ConnectionInitializationResponse',
  ANONYMOUS_INITIALIZATION_MESSAGE: 'AnonymousInitializationMessage',
  TUNNELBROKER_APNS_NOTIF: 'APNsNotif',
  MESSAGE_TO_DEVICE_REQUEST_STATUS: 'MessageToDeviceRequestStatus',
  MESSAGE_TO_DEVICE_REQUEST: 'MessageToDeviceRequest',
  MESSAGE_TO_TUNNELBROKER_REQUEST: 'MessageToTunnelbrokerRequest',
  MESSAGE_TO_DEVICE: 'MessageToDevice',
  MESSAGE_RECEIVE_CONFIRMATION: 'MessageReceiveConfirmation',
  HEARTBEAT: 'Heartbeat',
});

export const tunnelbrokerMessageValidator: TUnion<TunnelbrokerMessage> =
  t.union([
    connectionInitializationMessageValidator,
    connectionInitializationResponseValidator,
    messageToDeviceRequestStatusValidator,
    messageToDeviceRequestValidator,
    messageToDeviceValidator,
    messageReceiveConfirmationValidator,
    heartbeatValidator,
    messageToTunnelbrokerRequestValidator,
  ]);

export type TunnelbrokerMessage =
  | ConnectionInitializationMessage
  | ConnectionInitializationResponse
  | MessageToDeviceRequestStatus
  | MessageToDeviceRequest
  | MessageToDevice
  | MessageReceiveConfirmation
  | Heartbeat
  | MessageToTunnelbrokerRequest
  | TunnelbrokerAPNsNotif;
