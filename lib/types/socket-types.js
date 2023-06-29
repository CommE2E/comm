// @flow

import invariant from 'invariant';
import t, { type TInterface, type TUnion } from 'tcomb';

import {
  type ActivityUpdate,
  activityUpdateValidator,
  type UpdateActivityResult,
  updateActivityResultValidator,
} from './activity-types.js';
import type { Platform } from './device-types.js';
import type { APIRequest } from './endpoints.js';
import {
  type RawEntryInfo,
  rawEntryInfoValidator,
  type CalendarQuery,
  calendarQueryValidator,
  defaultCalendarQuery,
} from './entry-types.js';
import {
  type MessagesResponse,
  messagesResponseValidator,
  type NewMessagesPayload,
  newMessagesPayloadValidator,
} from './message-types.js';
import {
  type ServerServerRequest,
  serverServerRequestValidator,
  type ClientServerRequest,
  type ClientResponse,
  type ClientClientResponse,
} from './request-types.js';
import type { SessionState, SessionIdentification } from './session-types.js';
import { type RawThreadInfo, rawThreadInfoValidator } from './thread-types.js';
import {
  type ClientUpdatesResult,
  type ClientUpdatesResultWithUserInfos,
  type ServerUpdatesResult,
  serverUpdatesResultValidator,
  type ServerUpdatesResultWithUserInfos,
  serverUpdatesResultWithUserInfosValidator,
} from './update-types.js';
import {
  type UserInfo,
  userInfoValidator,
  type CurrentUserInfo,
  currentUserInfoValidator,
  type OldCurrentUserInfo,
  oldCurrentUserInfoValidator,
  type LoggedOutUserInfo,
  loggedOutUserInfoValidator,
} from './user-types.js';
import { tShape, tNumber, tID } from '../utils/validation-utils.js';

// The types of messages that the client sends across the socket
export const clientSocketMessageTypes = Object.freeze({
  INITIAL: 0,
  RESPONSES: 1,
  //ACTIVITY_UPDATES: 2, (DEPRECATED)
  PING: 3,
  ACK_UPDATES: 4,
  API_REQUEST: 5,
});
export type ClientSocketMessageType = $Values<typeof clientSocketMessageTypes>;
export function assertClientSocketMessageType(
  ourClientSocketMessageType: number,
): ClientSocketMessageType {
  invariant(
    ourClientSocketMessageType === 0 ||
      ourClientSocketMessageType === 1 ||
      ourClientSocketMessageType === 3 ||
      ourClientSocketMessageType === 4 ||
      ourClientSocketMessageType === 5,
    'number is not ClientSocketMessageType enum',
  );
  return ourClientSocketMessageType;
}

export type InitialClientSocketMessage = {
  +type: 0,
  +id: number,
  +payload: {
    +sessionIdentification: SessionIdentification,
    +sessionState: SessionState,
    +clientResponses: $ReadOnlyArray<ClientResponse>,
  },
};
export type ResponsesClientSocketMessage = {
  +type: 1,
  +id: number,
  +payload: {
    +clientResponses: $ReadOnlyArray<ClientResponse>,
  },
};
export type PingClientSocketMessage = {
  +type: 3,
  +id: number,
};
export type AckUpdatesClientSocketMessage = {
  +type: 4,
  +id: number,
  +payload: {
    +currentAsOf: number,
  },
};
export type APIRequestClientSocketMessage = {
  +type: 5,
  +id: number,
  +payload: APIRequest,
};
export type ClientSocketMessage =
  | InitialClientSocketMessage
  | ResponsesClientSocketMessage
  | PingClientSocketMessage
  | AckUpdatesClientSocketMessage
  | APIRequestClientSocketMessage;

export type ClientInitialClientSocketMessage = {
  +type: 0,
  +id: number,
  +payload: {
    +sessionIdentification: SessionIdentification,
    +sessionState: SessionState,
    +clientResponses: $ReadOnlyArray<ClientClientResponse>,
  },
};
export type ClientResponsesClientSocketMessage = {
  +type: 1,
  +id: number,
  +payload: {
    +clientResponses: $ReadOnlyArray<ClientClientResponse>,
  },
};
export type ClientClientSocketMessage =
  | ClientInitialClientSocketMessage
  | ClientResponsesClientSocketMessage
  | PingClientSocketMessage
  | AckUpdatesClientSocketMessage
  | APIRequestClientSocketMessage;
export type ClientSocketMessageWithoutID = $Diff<
  ClientClientSocketMessage,
  { id: number },
>;

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
  API_RESPONSE: 8,
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
      ourServerSocketMessageType === 7 ||
      ourServerSocketMessageType === 8,
    'number is not ServerSocketMessageType enum',
  );
  return ourServerSocketMessageType;
}

export const stateSyncPayloadTypes = Object.freeze({
  FULL: 0,
  INCREMENTAL: 1,
});

export const fullStateSyncActionType = 'FULL_STATE_SYNC';
export type BaseFullStateSync = {
  +messagesResult: MessagesResponse,
  +threadInfos: { +[id: string]: RawThreadInfo },
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +updatesCurrentAsOf: number,
};
const baseFullStateSyncValidator = tShape<BaseFullStateSync>({
  messagesResult: messagesResponseValidator,
  threadInfos: t.dict(tID, rawThreadInfoValidator),
  rawEntryInfos: t.list(rawEntryInfoValidator),
  userInfos: t.list(userInfoValidator),
  updatesCurrentAsOf: t.Number,
});

export type ClientFullStateSync = {
  ...BaseFullStateSync,
  +currentUserInfo: CurrentUserInfo,
};
export type StateSyncFullActionPayload = {
  ...ClientFullStateSync,
  +calendarQuery: CalendarQuery,
};
export type ClientStateSyncFullSocketPayload = {
  ...ClientFullStateSync,
  +type: 0,
  // Included iff client is using sessionIdentifierTypes.BODY_SESSION_ID
  +sessionID?: string,
};

export type ServerFullStateSync = {
  ...BaseFullStateSync,
  +currentUserInfo: CurrentUserInfo | OldCurrentUserInfo,
};
const serverFullStateSyncValidator = tShape<ServerFullStateSync>({
  ...baseFullStateSyncValidator.meta.props,
  currentUserInfo: t.union([
    currentUserInfoValidator,
    oldCurrentUserInfoValidator,
  ]),
});

export type ServerStateSyncFullSocketPayload = {
  ...ServerFullStateSync,
  +type: 0,
  // Included iff client is using sessionIdentifierTypes.BODY_SESSION_ID
  +sessionID?: string,
};
const serverStateSyncFullSocketPayloadValidator =
  tShape<ServerStateSyncFullSocketPayload>({
    ...serverFullStateSyncValidator.meta.props,
    type: tNumber(stateSyncPayloadTypes.FULL),
    sessionID: t.maybe(t.String),
  });

export const incrementalStateSyncActionType = 'INCREMENTAL_STATE_SYNC';
export type BaseIncrementalStateSync = {
  +messagesResult: MessagesResponse,
  +deltaEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  +deletedEntryIDs: $ReadOnlyArray<string>,
  +userInfos: $ReadOnlyArray<UserInfo>,
};
const baseIncrementalStateSyncValidator = tShape<BaseIncrementalStateSync>({
  messagesResult: messagesResponseValidator,
  deltaEntryInfos: t.list(rawEntryInfoValidator),
  deletedEntryIDs: t.list(tID),
  userInfos: t.list(userInfoValidator),
});

export type ClientIncrementalStateSync = {
  ...BaseIncrementalStateSync,
  +updatesResult: ClientUpdatesResult,
};
export type StateSyncIncrementalActionPayload = {
  ...ClientIncrementalStateSync,
  +calendarQuery: CalendarQuery,
};
type ClientStateSyncIncrementalSocketPayload = {
  +type: 1,
  ...ClientIncrementalStateSync,
};

export type ServerIncrementalStateSync = {
  ...BaseIncrementalStateSync,
  +updatesResult: ServerUpdatesResult,
};
const serverIncrementalStateSyncValidator = tShape<ServerIncrementalStateSync>({
  ...baseIncrementalStateSyncValidator.meta.props,
  updatesResult: serverUpdatesResultValidator,
});

type ServerStateSyncIncrementalSocketPayload = {
  +type: 1,
  ...ServerIncrementalStateSync,
};
const serverStateSyncIncrementalSocketPayloadValidator =
  tShape<ServerStateSyncIncrementalSocketPayload>({
    type: tNumber(stateSyncPayloadTypes.INCREMENTAL),
    ...serverIncrementalStateSyncValidator.meta.props,
  });

export type ClientStateSyncSocketPayload =
  | ClientStateSyncFullSocketPayload
  | ClientStateSyncIncrementalSocketPayload;
export type ServerStateSyncSocketPayload =
  | ServerStateSyncFullSocketPayload
  | ServerStateSyncIncrementalSocketPayload;
const serverStateSyncSocketPayloadValidator = t.union([
  serverStateSyncFullSocketPayloadValidator,
  serverStateSyncIncrementalSocketPayloadValidator,
]);

export type ServerStateSyncServerSocketMessage = {
  +type: 0,
  +responseTo: number,
  +payload: ServerStateSyncSocketPayload,
};
export const serverStateSyncServerSocketMessageValidator: TInterface<ServerStateSyncServerSocketMessage> =
  tShape<ServerStateSyncServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.STATE_SYNC),
    responseTo: t.Number,
    payload: serverStateSyncSocketPayloadValidator,
  });

export type ServerRequestsServerSocketMessage = {
  +type: 1,
  +responseTo?: number,
  +payload: {
    +serverRequests: $ReadOnlyArray<ServerServerRequest>,
  },
};
export const serverRequestsServerSocketMessageValidator: TInterface<ServerRequestsServerSocketMessage> =
  tShape<ServerRequestsServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.REQUESTS),
    responseTo: t.maybe(t.Number),
    payload: tShape({
      serverRequests: t.list(serverServerRequestValidator),
    }),
  });

export type ErrorServerSocketMessage = {
  type: 2,
  responseTo?: number,
  message: string,
  payload?: Object,
};
export const errorServerSocketMessageValidator: TInterface<ErrorServerSocketMessage> =
  tShape<ErrorServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.ERROR),
    responseTo: t.maybe(t.Number),
    message: t.String,
    payload: t.maybe(t.Object),
  });

export type AuthErrorServerSocketMessage = {
  type: 3,
  responseTo: number,
  message: string,
  // If unspecified, it is because the client is using cookieSources.HEADER,
  // which means the server can't update the cookie from a socket message.
  sessionChange?: {
    cookie: string,
    currentUserInfo: LoggedOutUserInfo,
  },
};
export const authErrorServerSocketMessageValidator: TInterface<AuthErrorServerSocketMessage> =
  tShape<AuthErrorServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.AUTH_ERROR),
    responseTo: t.Number,
    message: t.String,
    sessionChange: t.maybe(
      tShape({ cookie: t.String, currentUserInfo: loggedOutUserInfoValidator }),
    ),
  });

export type ActivityUpdateResponseServerSocketMessage = {
  +type: 4,
  +responseTo: number,
  +payload: UpdateActivityResult,
};
export const activityUpdateResponseServerSocketMessageValidator: TInterface<ActivityUpdateResponseServerSocketMessage> =
  tShape<ActivityUpdateResponseServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE),
    responseTo: t.Number,
    payload: updateActivityResultValidator,
  });

export type PongServerSocketMessage = {
  +type: 5,
  +responseTo: number,
};
export const pongServerSocketMessageValidator: TInterface<PongServerSocketMessage> =
  tShape<PongServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.PONG),
    responseTo: t.Number,
  });

export type ServerUpdatesServerSocketMessage = {
  +type: 6,
  +payload: ServerUpdatesResultWithUserInfos,
};
export const serverUpdatesServerSocketMessageValidator: TInterface<ServerUpdatesServerSocketMessage> =
  tShape<ServerUpdatesServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.UPDATES),
    payload: serverUpdatesResultWithUserInfosValidator,
  });

export type MessagesServerSocketMessage = {
  +type: 7,
  +payload: NewMessagesPayload,
};
export const messagesServerSocketMessageValidator: TInterface<MessagesServerSocketMessage> =
  tShape<MessagesServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.MESSAGES),
    payload: newMessagesPayloadValidator,
  });

export type APIResponseServerSocketMessage = {
  +type: 8,
  +responseTo: number,
  +payload?: Object,
};
export const apiResponseServerSocketMessageValidator: TInterface<APIResponseServerSocketMessage> =
  tShape<APIResponseServerSocketMessage>({
    type: tNumber(serverSocketMessageTypes.API_RESPONSE),
    responseTo: t.Number,
    payload: t.maybe(t.Object),
  });

export type ServerServerSocketMessage =
  | ServerStateSyncServerSocketMessage
  | ServerRequestsServerSocketMessage
  | ErrorServerSocketMessage
  | AuthErrorServerSocketMessage
  | ActivityUpdateResponseServerSocketMessage
  | PongServerSocketMessage
  | ServerUpdatesServerSocketMessage
  | MessagesServerSocketMessage
  | APIResponseServerSocketMessage;
export const serverServerSocketMessageValidator: TUnion<ServerServerSocketMessage> =
  t.union([
    serverStateSyncServerSocketMessageValidator,
    serverRequestsServerSocketMessageValidator,
    errorServerSocketMessageValidator,
    authErrorServerSocketMessageValidator,
    activityUpdateResponseServerSocketMessageValidator,
    pongServerSocketMessageValidator,
    serverUpdatesServerSocketMessageValidator,
    messagesServerSocketMessageValidator,
    apiResponseServerSocketMessageValidator,
  ]);

export type ClientRequestsServerSocketMessage = {
  +type: 1,
  +responseTo?: number,
  +payload: {
    +serverRequests: $ReadOnlyArray<ClientServerRequest>,
  },
};
export type ClientStateSyncServerSocketMessage = {
  +type: 0,
  +responseTo: number,
  +payload: ClientStateSyncSocketPayload,
};
export type ClientUpdatesServerSocketMessage = {
  +type: 6,
  +payload: ClientUpdatesResultWithUserInfos,
};
export type ClientServerSocketMessage =
  | ClientStateSyncServerSocketMessage
  | ClientRequestsServerSocketMessage
  | ErrorServerSocketMessage
  | AuthErrorServerSocketMessage
  | ActivityUpdateResponseServerSocketMessage
  | PongServerSocketMessage
  | ClientUpdatesServerSocketMessage
  | MessagesServerSocketMessage
  | APIResponseServerSocketMessage;

export type SocketListener = (message: ClientServerSocketMessage) => void;

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnecting'
  | 'forcedDisconnecting'
  | 'disconnected';
export type ConnectionInfo = {
  +status: ConnectionStatus,
  +queuedActivityUpdates: $ReadOnlyArray<ActivityUpdate>,
  +actualizedCalendarQuery: CalendarQuery,
  +lateResponses: $ReadOnlyArray<number>,
  +showDisconnectedBar: boolean,
};
export const connectionInfoValidator: TInterface<ConnectionInfo> =
  tShape<ConnectionInfo>({
    status: t.enums.of([
      'connecting',
      'connected',
      'reconnecting',
      'disconnecting',
      'forcedDisconnecting',
      'disconnected',
    ]),
    queuedActivityUpdates: t.list(activityUpdateValidator),
    actualizedCalendarQuery: calendarQueryValidator,
    lateResponses: t.list(t.Number),
    showDisconnectedBar: t.Boolean,
  });
export const defaultConnectionInfo = (
  platform: Platform,
  timeZone?: ?string,
): ConnectionInfo =>
  ({
    status: 'connecting',
    queuedActivityUpdates: [],
    actualizedCalendarQuery: defaultCalendarQuery(platform, timeZone),
    lateResponses: [],
    showDisconnectedBar: false,
  }: ConnectionInfo);
export const updateConnectionStatusActionType = 'UPDATE_CONNECTION_STATUS';
export type UpdateConnectionStatusPayload = {
  +status: ConnectionStatus,
};

export const setLateResponseActionType = 'SET_LATE_RESPONSE';
export type SetLateResponsePayload = {
  +messageID: number,
  +isLate: boolean,
};

export const updateDisconnectedBarActionType = 'UPDATE_DISCONNECTED_BAR';
export type UpdateDisconnectedBarPayload = { +visible: boolean };

export type OneTimeKeyGenerator = (inc: number) => string;

export type GRPCStream = {
  readyState: number,
  onopen: (ev: any) => mixed,
  onmessage: (ev: MessageEvent) => mixed,
  onclose: (ev: CloseEvent) => mixed,
  close(code?: number, reason?: string): void,
  send(data: string | Blob | ArrayBuffer | $ArrayBufferView): void,
};

export type CommTransportLayer = GRPCStream | WebSocket;
