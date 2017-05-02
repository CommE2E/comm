// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarInfo } from '../types/calendar-types';
import type { UserInfo } from '../types/user-types';
import type { EntryInfo } from '../types/entry-types';
import type { CalendarResult } from './entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';

export type PingResult = {
  calendarInfos: {[id: string]: CalendarInfo},
  userInfo: ?UserInfo,
  calendarResult?: CalendarResult,
};
const pingActionType = "PING";
async function ping(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
): Promise<PingResult> {
  const response = await fetchJSON('ping.php', {
    'inner_entry_query': {
      'nav': calendarQuery.navID,
      'start_date': calendarQuery.startDate,
      'end_date': calendarQuery.endDate,
      'include_deleted': !!calendarQuery.includeDeleted,
    },
  });
  const userInfo = response.user_info
    ? {
        email: response.user_info.email,
        username: response.user_info.username,
        emailVerified: response.user_info.email_verified,
      }
    : null;
  return {
    calendarInfos: response.calendar_infos,
    userInfo,
    calendarResult: {
      calendarQuery,
      entryInfos: response.entries,
    },
  };
}

export {
  pingActionType,
  ping,
}
