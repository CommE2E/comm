// @flow

import type { CalendarInfo } from './calendar-types';
import type { UserInfo } from './user-types';
import type { CalendarResult } from '../actions/entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';

// What gets returned from the server
export type PingResult = {
  calendarInfos: {[id: string]: CalendarInfo},
  userInfo: ?UserInfo,
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
