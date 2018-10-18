// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  ActivityUpdate,
  UpdateActivityResult,
} from '../types/activity-types';

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
  updateActivityActionTypes,
  updateActivity,
}
