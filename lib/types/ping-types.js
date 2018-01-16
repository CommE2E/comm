// @flow

import type { RawThreadInfo } from './thread-types';
import type { CurrentUserInfo, UserInfo } from './user-types';
import type { CalendarResult } from '../actions/entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { GenericMessagesResult } from '../actions/message-actions';

type InexactPingResult = {
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: ?CurrentUserInfo,
  messagesResult: GenericMessagesResult,
  calendarResult?: CalendarResult,
  userInfos: UserInfo[],
};

// What gets returned from the server
export type PingResult = $Exact<InexactPingResult>;

// Payload of PING_SUCCESS
export type PingSuccessPayload =
  $Exact<InexactPingResult & { loggedIn: bool }>;

// Payload of PING_STARTED
export type PingStartingPayload = {|
  loggedIn: bool,
  calendarQuery: CalendarQuery,
  newSessionID?: string,
  messageStorePruneRequest?: {
    threadIDs: string[],
  },
|};
