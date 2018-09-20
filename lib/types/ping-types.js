// @flow

import type { RawThreadInfo } from './thread-types';
import type { CurrentUserInfo, UserInfo } from './user-types';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  MessagesPingResponse,
  GenericMessagesResult,
} from './message-types';
import type { UpdatesResult } from './update-types';
import type { Platform } from './device-types';
import type { ServerRequest, ClientResponse } from './request-types';

import PropTypes from 'prop-types';

export type PingRequest = {|
  type?: PingResponseType,
  calendarQuery: CalendarQuery,
  watchedIDs: $ReadOnlyArray<string>,
  lastPing: ?number,
  messagesCurrentAsOf: ?number,
  updatesCurrentAsOf: ?number,
  clientResponses?: $ReadOnlyArray<ClientResponse>,
|};

export const pingResponseTypes = Object.freeze({
  FULL: 0,
  INCREMENTAL: 1,
});
type PingResponseType = $Values<typeof pingResponseTypes>;

export type PingResponse =
  | {|
      type: 0,
      threadInfos: {[id: string]: RawThreadInfo},
      currentUserInfo: CurrentUserInfo,
      rawMessageInfos: RawMessageInfo[],
      truncationStatuses: MessageTruncationStatuses,
      messagesCurrentAsOf: number,
      serverTime: number,
      rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
      userInfos: $ReadOnlyArray<UserInfo>,
      updatesResult?: UpdatesResult,
      serverRequests?: $ReadOnlyArray<ServerRequest>,
      deltaEntryInfos?: $ReadOnlyArray<RawEntryInfo>,
    |}
  | {|
      type: 1,
      messagesResult: MessagesPingResponse,
      updatesResult?: UpdatesResult,
      deltaEntryInfos: $ReadOnlyArray<RawEntryInfo>,
      userInfos: $ReadOnlyArray<UserInfo>,
      serverRequests: $ReadOnlyArray<ServerRequest>,
    |};

export type PingPrevState = {|
  threadInfos: {[id: string]: RawThreadInfo},
  entryInfos: {[id: string]: RawEntryInfo},
  currentUserInfo: ?CurrentUserInfo,
|};

export type PingResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: CurrentUserInfo,
  messagesResult: GenericMessagesResult,
  calendarResult: CalendarResult,
  userInfos: $ReadOnlyArray<UserInfo>,
  loggedIn: bool,
  prevState: PingPrevState,
  updatesResult: UpdatesResult,
  requests: {
    serverRequests: $ReadOnlyArray<ServerRequest>,
    deliveredClientResponses: $ReadOnlyArray<ClientResponse>,
  },
  deltaEntryInfos: ?$ReadOnlyArray<RawEntryInfo>,
|};

export type PingStartingPayload = {|
  loggedIn: bool,
  calendarQuery: CalendarQuery,
  time: number,
  messageStorePruneRequest?: {
    threadIDs: $ReadOnlyArray<string>,
  },
|};

export type PingActionInput = {|
  loggedIn: bool,
  calendarQuery: CalendarQuery,
  messagesCurrentAsOf: number,
  updatesCurrentAsOf: number,
  prevState: PingPrevState,
  clientResponses: $ReadOnlyArray<ClientResponse>,
|};

export type PingTimestamps = {|
  lastStarted: number,
  lastSuccess: number,
  lastCompletion: number,
|};

export const pingTimestampsPropType = PropTypes.shape({
  lastStarted: PropTypes.number.isRequired,
  lastSuccess: PropTypes.number.isRequired,
  lastCompletion: PropTypes.number.isRequired,
});

export const defaultPingTimestamps: PingTimestamps = {
  lastStarted: 0,
  lastSuccess: 0,
  lastCompletion: 0,
};
