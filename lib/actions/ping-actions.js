// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarInfo } from '../types/calendar-types';
import type { UserInfo } from '../types/user-types';

export type PingResult = {
  calendarInfos: {[id: string]: CalendarInfo},
  userInfo: ?UserInfo,
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

export {
  pingActionType,
  ping,
}
