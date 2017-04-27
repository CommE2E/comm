// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarInfo } from '../types/calendar-types';
import type { UserInfo } from '../types/user-types';
import type { EntryInfo } from '../types/entry-types';
import type { InnerEntryQuery } from '../utils/entry-utils';

export type PingResult = {
  calendarInfos: {[id: string]: CalendarInfo},
  userInfo: ?UserInfo,
  entryInfos?: EntryInfo[],
};
const pingActionType = "PING";
async function ping(fetchJSON: FetchJSON): Promise<PingResult> {
  const response = await fetchJSON('ping.php', {});
  const userInfo = response.user_info
    ? {
        email: response.user_info.email,
        username: response.user_info.username,
        emailVerified: response.user_info.email_verified,
      }
    : null;
  return { calendarInfos: response.calendar_infos, userInfo };
}

async function pingAndFetchEntries(
  fetchJSON: FetchJSON,
  innerEntryQuery: InnerEntryQuery,
): Promise<PingResult> {
  const response = await fetchJSON('ping.php', {
    'inner_entry_query': innerEntryQuery,
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
    entryInfos: response.entries,
  };
}

export {
  pingActionType,
  ping,
  pingAndFetchEntries,
}
