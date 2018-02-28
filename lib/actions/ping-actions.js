// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarQuery } from '../types/entry-types';
import type { PingResult } from '../types/ping-types';
import type {
  ActivityUpdate,
  UpdateActivityResult,
} from '../types/activity-types';

import threadWatcher from '../shared/thread-watcher';
import { getConfig } from '../utils/config';

const pingActionTypes = Object.freeze({
  started: "PING_STARTED",
  success: "PING_SUCCESS",
  failed: "PING_FAILED",
});
async function ping(
  fetchJSON: FetchJSON,
  calendarQuery: CalendarQuery,
  lastPing: number,
): Promise<PingResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('ping', {
    calendarQuery,
    lastPing,
    watchedIDs,
  });
  return {
    threadInfos: response.threadInfos,
    currentUserInfo: response.currentUserInfo,
    calendarResult: {
      calendarQuery,
      rawEntryInfos: response.rawEntryInfos,
      userInfos: response.userInfos,
    },
    messagesResult: {
      messageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses,
      serverTime: response.serverTime,
      watchedIDsAtRequestTime: watchedIDs,
    },
    userInfos: response.userInfos,
  };
}

const updateActivityActionTypes = Object.freeze({
  started: "UPDATE_ACTIVITY_STARTED",
  success: "UPDATE_ACTIVITY_SUCCESS",
  failed: "UPDATE_ACTIVITY_FAILED",
});
async function updateActivity(
  fetchJSON: FetchJSON,
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
): Promise<UpdateActivityResult> {
  const response = await fetchJSON(
    'update_activity',
    { updates: activityUpdates },
  );
  return {
    unfocusedToUnread: response.unfocusedToUnread,
  };
}

export {
  pingActionTypes,
  ping,
  updateActivityActionTypes,
  updateActivity,
}
