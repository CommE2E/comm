// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { PingResult } from '../types/ping-types';

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
    threadInfos: response.thread_infos,
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
