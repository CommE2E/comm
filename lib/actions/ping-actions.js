// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { PingResult } from '../types/ping-types';

const pingActionTypes = {
  started: "PING_STARTED",
  success: "PING_SUCCESS",
  failed: "PING_FAILED",
};
async function ping(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
  lastPing: number,
): Promise<PingResult> {
  const response = await fetchJSON('ping.php', {
    'inner_entry_query': {
      'nav': calendarQuery.navID,
      'start_date': calendarQuery.startDate,
      'end_date': calendarQuery.endDate,
      'include_deleted': !!calendarQuery.includeDeleted,
    },
    'last_ping': lastPing,
  });
  const userInfo = response.user_info
    ? {
        id: response.user_info.id,
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
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
    },
  };
}

export {
  pingActionTypes,
  ping,
}
