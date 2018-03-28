// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { PingActionInput, PingResult } from '../types/ping-types';
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
  actionInput: PingActionInput,
): Promise<PingResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('ping', {
    calendarQuery: actionInput.calendarQuery,
    lastPing: actionInput.currentAsOf,
    watchedIDs,
  });
  return {
    threadInfos: response.threadInfos,
    currentUserInfo: response.currentUserInfo,
    calendarResult: {
      calendarQuery: actionInput.calendarQuery,
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
    loggedIn: actionInput.loggedIn,
    prevState: actionInput.prevState,
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
