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

import invariant from 'invariant';

import { pingResponseTypes } from './ping-types';

// The types of messages that the client sends across the socket
export const clientSocketMessageTypes = Object.freeze({
  INITIAL: 0,
});
export type ClientSocketMessageType = $Values<typeof clientSocketMessageTypes>;
export function assertClientSocketMessageType(
  ourClientSocketMessageType: number,
): ClientSocketMessageType {
  invariant(
    ourClientSocketMessageType === 0,
    "number is not ClientSocketMessageType enum",
  );
  return ourClientSocketMessageType;
}

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

export type InitialClientSocketMessage = {|
  type: 0,
  id: number,
  payload: {|
    sessionIdentification: SessionIdentification,
    sessionState: SessionState,
    clientResponses: $ReadOnlyArray<ClientResponse>,
  |},
|};
export type ClientSocketMessage =
  | InitialClientSocketMessage;

export const stateSyncPayloadTypes = pingResponseTypes;
export type StateSyncFullPayload = {|
  type: 0,
  messagesResult: MessagesPingResponse,
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: CurrentUserInfo,
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
  // Included iff client is using sessionIdentifierTypes.BODY_SESSION_ID
  sessionID?: string,
|};
type StateSyncIncrementalPayload = {|
  type: 1,
  messagesResult: MessagesPingResponse,
  updatesResult: UpdatesResult,
  deltaEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
|};
export type StateSyncPayload =
  | StateSyncFullPayload
  | StateSyncIncrementalPayload;

export type StateSyncServerSocketMessage = {|
  type: 0,
  responseTo: number,
  payload: StateSyncPayload,
|};
export type RequestsServerSocketMessage = {|
  type: 1,
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
  currentUserInfo?: LoggedOutUserInfo,
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
  | "disconnected";
export type ConnectionInfo = {|
  status: ConnectionStatus,
|};
export const defaultConnectionInfo = {
  status: "connecting",
};
