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

export type PingRequest = {|
  calendarQuery: CalendarQuery,
  lastPing: number,
  watchedIDs: $ReadOnlyArray<string>,
|};

export type PingResponse = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: CurrentUserInfo,
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  serverTime: number,
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
|};

export type PingResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: CurrentUserInfo,
  messagesResult: GenericMessagesResult,
  calendarResult: CalendarResult,
  userInfos: $ReadOnlyArray<UserInfo>,
|};

export type PingStartingPayload = {|
  loggedIn: bool,
  calendarQuery: CalendarQuery,
  newSessionID?: string,
  messageStorePruneRequest?: {
    threadIDs: $ReadOnlyArray<string>,
  },
|};

export type PingSuccessPayload = {|
  ...PingResult,
  loggedIn: bool,
|};
