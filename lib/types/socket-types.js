// @flow

import type { SessionState, SessionIdentification } from './session-types';
import type { ServerRequest, ClientResponse } from './request-types';
import type { RawThreadInfo } from './thread-types';
import type { MessagesPingResponse } from './message-types';
import type { UpdatesResult } from './update-types';
import type {
  UserInfo,
  CurrentUserInfo,
  LoggedOutUserInfo,
} from './user-types';
import type { RawEntryInfo } from './entry-types';
import type { ActivityUpdate } from './activity-types';

import invariant from 'invariant';

import { pingResponseTypes } from './ping-types';

// The types of messages that the client sends across the socket
export const clientSocketMessageTypes = Object.freeze({
  INITIAL: 0,
  RESPONSES: 1,
});
export type ClientSocketMessageType = $Values<typeof clientSocketMessageTypes>;
export function assertClientSocketMessageType(
  ourClientSocketMessageType: number,
): ClientSocketMessageType {
  invariant(
    ourClientSocketMessageType === 0 ||
      ourClientSocketMessageType === 1,
    "number is not ClientSocketMessageType enum",
  );
  return ourClientSocketMessageType;
}

export type InitialClientSocketMessage = {|
  type: 0,
  id: number,
  payload: {|
    sessionIdentification: SessionIdentification,
    sessionState: SessionState,
    clientResponses: $ReadOnlyArray<ClientResponse>,
  |},
|};
export type ResponsesClientSocketMessage = {|
  type: 1,
  id: number,
  payload: {|
    clientResponses: $ReadOnlyArray<ClientResponse>,
  |},
|};
export type ClientSocketMessage =
  | InitialClientSocketMessage
  | ResponsesClientSocketMessage;

// The types of messages that the server sends across the socket
export const serverSocketMessageTypes = Object.freeze({
  STATE_SYNC: 0,
  REQUESTS: 1,
  ERROR: 2,
  AUTH_ERROR: 3,
});
export type ServerSocketMessageType = $Values<typeof serverSocketMessageTypes>;
export function assertServerSocketMessageType(
  ourServerSocketMessageType: number,
): ServerSocketMessageType {
  invariant(
    ourServerSocketMessageType === 0 ||
      ourServerSocketMessageType === 1 ||
      ourServerSocketMessageType === 2 ||
      ourServerSocketMessageType === 3,
    "number is not ServerSocketMessageType enum",
  );
  return ourServerSocketMessageType;
}

export const stateSyncPayloadTypes = pingResponseTypes;
export type StateSyncFullActionPayload = {|
  messagesResult: MessagesPingResponse,
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: CurrentUserInfo,
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
  updatesCurrentAsOf: number,
|};
export const fullStateSyncActionType = "FULL_STATE_SYNC";
export type StateSyncFullSocketPayload = {|
  ...StateSyncFullActionPayload,
  type: 0,
  // Included iff client is using sessionIdentifierTypes.BODY_SESSION_ID
  sessionID?: string,
|};
export type StateSyncIncrementalActionPayload = {|
  messagesResult: MessagesPingResponse,
  updatesResult: UpdatesResult,
  deltaEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
|};
export const incrementalStateSyncActionType = "INCREMENTAL_STATE_SYNC";
type StateSyncIncrementalSocketPayload = {|
  type: 1,
  ...StateSyncIncrementalActionPayload,
|};
export type StateSyncSocketPayload =
  | StateSyncFullSocketPayload
  | StateSyncIncrementalSocketPayload;

export type StateSyncServerSocketMessage = {|
  type: 0,
  responseTo: number,
  payload: StateSyncSocketPayload,
|};
export type RequestsServerSocketMessage = {|
  type: 1,
  responseTo: number,
  payload: {|
    serverRequests: $ReadOnlyArray<ServerRequest>,
  |},
|};
export type ErrorServerSocketMessage = {|
  type: 2,
  responseTo?: number,
  message: string,
  payload?: Object,
|};
export type AuthErrorServerSocketMessage = {|
  type: 3,
  responseTo: number,
  message: string,
  // If unspecified, it is because the client is using cookieSources.HEADER,
  // which means the server can't update the cookie from a socket message.
  sessionChange?: {
    cookie: string,
    currentUserInfo: LoggedOutUserInfo,
  },
|};
export type ServerSocketMessage =
  | StateSyncServerSocketMessage
  | RequestsServerSocketMessage
  | ErrorServerSocketMessage
  | AuthErrorServerSocketMessage;

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting"
  | "forcedDisconnecting"
  | "disconnected";
export type ConnectionInfo = {|
  status: ConnectionStatus,
  queuedActivityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};
export const defaultConnectionInfo = {
  status: "connecting",
  queuedActivityUpdates: [],
};
export const updateConnectionStatusActionType = "UPDATE_CONNECTION_STATUS";
export type UpdateConnectionStatusPayload = {|
  status: ConnectionStatus,
|};
export const queueActivityUpdateActionType = "QUEUE_ACTIVITY_UPDATE";
export type QueueActivityUpdatePayload = {|
  activityUpdate: ActivityUpdate,
|};
export const clearQueuedActivityUpdatesActionType =
  "CLEAR_QUEUED_ACTIVITY_UPDATES";
export type ClearActivityUpdatesPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};
