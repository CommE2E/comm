// @flow

import type { ThreadInfo } from './thread-types';
import type { UserInfo } from './user-types';
import type { CalendarResult } from '../actions/entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { GenericMessagesResult } from '../actions/message-actions';

// What gets returned from the server
export type PingResult = {
  threadInfos: {[id: string]: ThreadInfo},
  userInfo: ?UserInfo,
  messagesResult: GenericMessagesResult,
  calendarResult?: CalendarResult,
};

// Payload of PING_SUCCESS
export type PingSuccessPayload = PingResult & {
  loggedIn: bool,
};

// Payload of PING_STARTED
export type PingStartingPayload = {
  loggedIn: bool,
  calendarQuery: CalendarQuery,
  newSessionID?: string,
};
