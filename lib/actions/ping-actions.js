// @flow

import type { FetchJSON } from '../utils/fetch-json';
import {
  type PingActionInput,
  type PingResult,
  pingResponseTypes,
} from '../types/ping-types';
import type {
  ActivityUpdate,
  UpdateActivityResult,
} from '../types/activity-types';

import threadWatcher from '../shared/thread-watcher';

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
    type: pingResponseTypes.INCREMENTAL,
    calendarQuery: actionInput.calendarQuery,
    messagesCurrentAsOf: actionInput.messagesCurrentAsOf,
    updatesCurrentAsOf: actionInput.updatesCurrentAsOf,
    clientResponses: actionInput.clientResponses,
    watchedIDs,
  });
  if (!response.updatesResult) {
    throw new Error("we have an anonymous cookie but think we're logged in");
  }
  const requests = {
    serverRequests: response.serverRequests ? response.serverRequests : [],
    deliveredClientResponses: actionInput.clientResponses,
  };
  if (response.type === pingResponseTypes.INCREMENTAL) {
    return {
      type: pingResponseTypes.INCREMENTAL,
      prevState: actionInput.prevState,
      messagesResult: {
        messageInfos: response.messagesResult.rawMessageInfos,
        truncationStatus: response.messagesResult.truncationStatuses,
        watchedIDsAtRequestTime: watchedIDs,
        currentAsOf: response.messagesResult.currentAsOf,
      },
      updatesResult: response.updatesResult,
      deltaEntryInfos: response.deltaEntryInfos,
      calendarQuery: actionInput.calendarQuery,
      userInfos: response.userInfos,
      requests,
    };
  }
  return {
    type: pingResponseTypes.FULL,
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
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: response.messagesCurrentAsOf,
    },
    userInfos: response.userInfos,
    prevState: actionInput.prevState,
    updatesResult: response.updatesResult,
    requests,
    deltaEntryInfos: response.deltaEntryInfos,
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
