// @flow

import type { SessionState, SessionIdentification } from './session-types';
import type { ClientResponse } from './request-types';

import invariant from 'invariant';

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
  INITIAL_RESPONSE: 0,
});
export type ServerSocketMessageType = $Values<typeof serverSocketMessageTypes>;
export function assertServerSocketMessageType(
  ourServerSocketMessageType: number,
): ServerSocketMessageType {
  invariant(
    ourServerSocketMessageType === 0,
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
