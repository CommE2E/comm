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
  return {
    threadInfos: response.thread_infos,
    currentUserInfo: response.current_user_info,
    calendarResult: {
      calendarQuery,
      entryInfos: response.entry_infos,
      userInfos: response.user_infos,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
    },
    userInfos: response.user_infos,
  };
}

export {
  pingActionTypes,
  ping,
}
