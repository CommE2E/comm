// @flow

import type {
  ActivityUpdate,
  ActivityUpdateSuccessPayload,
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../types/activity-types.js';
import { extractKeyserverIDFromID } from '../utils/action-utils.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call';
import { useKeyserverCall } from '../utils/keyserver-call.js';

export type UpdateActivityInput = {
  +activityUpdates: $ReadOnlyArray<ActivityUpdate>,
};

const updateActivityActionTypes = Object.freeze({
  started: 'UPDATE_ACTIVITY_STARTED',
  success: 'UPDATE_ACTIVITY_SUCCESS',
  failed: 'UPDATE_ACTIVITY_FAILED',
});
const updateActivity =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: UpdateActivityInput) => Promise<ActivityUpdateSuccessPayload>) =>
  async input => {
    const { activityUpdates } = input;
    const requests: { [string]: { +updates: ActivityUpdate[] } } = {};
    for (const update of activityUpdates) {
      const keyserverID = extractKeyserverIDFromID(update.threadID);
      if (!requests[keyserverID]) {
        requests[keyserverID] = { updates: [] };
      }
      requests[keyserverID].updates.push(update);
    }

    const responses = await callKeyserverEndpoint('update_activity', requests);

    let unfocusedToUnread: $ReadOnlyArray<string> = [];
    for (const keyserverID in responses) {
      unfocusedToUnread = unfocusedToUnread.concat(
        responses[keyserverID].unfocusedToUnread,
      );
    }

    const sortedActivityUpdates: {
      [keyserverID: string]: $ReadOnlyArray<ActivityUpdate>,
    } = {};
    for (const keyserverID in requests) {
      sortedActivityUpdates[keyserverID] = requests[keyserverID].updates;
    }

    return {
      activityUpdates: sortedActivityUpdates,
      result: {
        unfocusedToUnread,
      },
    };
  };

function useUpdateActivity(): (
  input: UpdateActivityInput,
) => Promise<ActivityUpdateSuccessPayload> {
  return useKeyserverCall(updateActivity);
}

const setThreadUnreadStatusActionTypes = Object.freeze({
  started: 'SET_THREAD_UNREAD_STATUS_STARTED',
  success: 'SET_THREAD_UNREAD_STATUS_SUCCESS',
  failed: 'SET_THREAD_UNREAD_STATUS_FAILED',
});
const setThreadUnreadStatus =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'set_thread_unread_status',
      requests,
    );
    return {
      resetToUnread: responses[keyserverID].resetToUnread,
      threadID: input.threadID,
    };
  };

function useSetThreadUnreadStatus(): (
  request: SetThreadUnreadStatusRequest,
) => Promise<SetThreadUnreadStatusPayload> {
  return useKeyserverCall(setThreadUnreadStatus);
}

export {
  updateActivityActionTypes,
  useUpdateActivity,
  setThreadUnreadStatusActionTypes,
  useSetThreadUnreadStatus,
};
