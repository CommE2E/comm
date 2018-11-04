// @flow

import type { SessionState, SessionIdentification } from './session-types';
import type { ServerRequest, ClientResponse } from './request-types';
import type { RawThreadInfo } from './thread-types';
import type {
  MessagesResponse,
  MessagesResultWithUserInfos,
} from './message-types';
import type { UpdatesResult, UpdatesResultWithUserInfos } from './update-types';
import type {
  UserInfo,
  CurrentUserInfo,
  LoggedOutUserInfo,
} from './user-types';
import type { RawEntryInfo } from './entry-types';
import {
  type ActivityUpdate,
  type UpdateActivityResult,
  activityUpdatePropType,
} from './activity-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

// The types of messages that the client sends across the socket
export const clientSocketMessageTypes = Object.freeze({
  INITIAL: 0,
  RESPONSES: 1,
  ACTIVITY_UPDATES: 2,
  PING: 3,
});
export type ClientSocketMessageType = $Values<typeof clientSocketMessageTypes>;
export function assertClientSocketMessageType(
  ourClientSocketMessageType: number,
): ClientSocketMessageType {
  invariant(
    ourClientSocketMessageType === 0 ||
      ourClientSocketMessageType === 1 ||
      ourClientSocketMessageType === 2 ||
      ourClientSocketMessageType === 3,
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
export type ActivityUpdatesClientSocketMessage = {|
  type: 2,
  id: number,
  payload: {|
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  |},
|};
export type PingClientSocketMessage = {|
  type: 3,
  id: number,
|};
export type ClientSocketMessage =
  | InitialClientSocketMessage
  | ResponsesClientSocketMessage
  | ActivityUpdatesClientSocketMessage
  | PingClientSocketMessage;
export type ClientSocketMessageWithoutID =
  $Diff<ClientSocketMessage, { id: number }>;

// The types of messages that the server sends across the socket
export const serverSocketMessageTypes = Object.freeze({
  STATE_SYNC: 0,
  REQUESTS: 1,
  ERROR: 2,
  AUTH_ERROR: 3,
  ACTIVITY_UPDATE_RESPONSE: 4,
  PONG: 5,
  UPDATES: 6,
  MESSAGES: 7,
});
export type ServerSocketMessageType = $Values<typeof serverSocketMessageTypes>;
export function assertServerSocketMessageType(
  ourServerSocketMessageType: number,
): ServerSocketMessageType {
  invariant(
    ourServerSocketMessageType === 0 ||
      ourServerSocketMessageType === 1 ||
      ourServerSocketMessageType === 2 ||
      ourServerSocketMessageType === 3 ||
      ourServerSocketMessageType === 4 ||
      ourServerSocketMessageType === 5 ||
      ourServerSocketMessageType === 6 ||
      ourServerSocketMessageType === 7,
    "number is not ServerSocketMessageType enum",
  );
  return ourServerSocketMessageType;
}

export const stateSyncPayloadTypes = Object.freeze({
  FULL: 0,
  INCREMENTAL: 1,
});
export type StateSyncFullActionPayload = {|
  messagesResult: MessagesResponse,
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
  messagesResult: MessagesResponse,
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
export type ActivityUpdateResponseServerSocketMessage = {|
  type: 4,
  responseTo: number,
  payload: UpdateActivityResult,
|};
export type PongServerSocketMessage = {|
  type: 5,
  responseTo: number,
|};
export type UpdatesServerSocketMessage = {|
  type: 6,
  payload: UpdatesResultWithUserInfos,
|};
export type MessagesServerSocketMessage = {|
  type: 7,
  payload: MessagesResultWithUserInfos,
|};
export type ServerSocketMessage =
  | StateSyncServerSocketMessage
  | RequestsServerSocketMessage
  | ErrorServerSocketMessage
  | AuthErrorServerSocketMessage
  | ActivityUpdateResponseServerSocketMessage
  | PongServerSocketMessage
  | UpdatesServerSocketMessage
  | MessagesServerSocketMessage;

export type SocketListener = (message: ServerSocketMessage) => void;

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
export const connectionInfoPropType = PropTypes.shape({
  status: PropTypes.oneOf([
    "connecting",
    "connected",
    "reconnecting",
    "disconnecting",
    "forcedDisconnecting",
    "disconnected",
  ]).isRequired,
  queuedActivityUpdates: PropTypes.arrayOf(activityUpdatePropType).isRequired,
});
export const defaultConnectionInfo = {
  status: "connecting",
  queuedActivityUpdates: [],
};
export const updateConnectionStatusActionType = "UPDATE_CONNECTION_STATUS";
export type UpdateConnectionStatusPayload = {|
  status: ConnectionStatus,
|};
export const queueActivityUpdatesActionType = "QUEUE_ACTIVITY_UPDATES";
export type QueueActivityUpdatesPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};
export const activityUpdateSuccessActionType = "ACTIVITY_UPDATE_SUCCESS";
export type ActivityUpdateSuccessPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  result: UpdateActivityResult,
|};
export const activityUpdateFailedActionType = "ACTIVITY_UPDATE_FAILED";
export type ActivityUpdateFailedPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};
