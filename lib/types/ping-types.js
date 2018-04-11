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
  GenericMessagesResult,
} from './message-types';
import type { UpdatesResult } from './update-types';

import PropTypes from 'prop-types';

export type PingRequest = {|
  calendarQuery: CalendarQuery,
  watchedIDs: $ReadOnlyArray<string>,
  lastPing: ?number,
  messagesCurrentAsOf: ?number,
  updatesCurrentAsOf: ?number,
|};

export type PingResponse = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: CurrentUserInfo,
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  messagesCurrentAsOf: number,
  serverTime: number,
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
  updatesResult?: UpdatesResult,
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
|};

export type PingStartingPayload = {|
  loggedIn: bool,
  calendarQuery: CalendarQuery,
  newSessionID?: string,
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
