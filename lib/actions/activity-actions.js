// @flow

import type {
  ActivityUpdate,
  ActivityUpdateSuccessPayload,
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
  SetThreadUnreadStatusResult,
} from '../types/activity-types';
import type { FetchJSON } from '../utils/fetch-json';

const updateActivityActionTypes = Object.freeze({
  started: 'UPDATE_ACTIVITY_STARTED',
  success: 'UPDATE_ACTIVITY_SUCCESS',
  failed: 'UPDATE_ACTIVITY_FAILED',
});
const updateActivity = (fetchJSON: FetchJSON): (
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
) => Promise<ActivityUpdateSuccessPayload> => async (activityUpdates) => {
  const response = await fetchJSON('update_activity', {
    updates: activityUpdates,
  });
  return {
    activityUpdates,
    result: {
      unfocusedToUnread: response.unfocusedToUnread,
    },
  };
};

const setThreadUnreadStatusActionTypes = Object.freeze({
  started: 'SET_THREAD_UNREAD_STATUS_STARTED',
  success: 'SET_THREAD_UNREAD_STATUS_SUCCESS',
  failed: 'SET_THREAD_UNREAD_STATUS_FAILED',
});
const setThreadUnreadStatus = (fetchJSON: FetchJSON): (
  request: SetThreadUnreadStatusRequest,
) => Promise<SetThreadUnreadStatusPayload> => async (request) => {
  const response: SetThreadUnreadStatusResult = await fetchJSON(
    'set_thread_unread_status',
    request,
  );
  return {
    resetToUnread: response.resetToUnread,
    threadID: request.threadID,
  };
};

export {
  updateActivityActionTypes,
  updateActivity,
  setThreadUnreadStatusActionTypes,
  setThreadUnreadStatus,
};
