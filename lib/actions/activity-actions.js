// @flow

import invariant from 'invariant';

import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type {
  ActivityUpdate,
  ActivityUpdateSuccessPayload,
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../types/activity-types.js';

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
      const optionalKeyserverID = extractKeyserverIDFromID(update.threadID);
      invariant(optionalKeyserverID, 'Keyserver ID should be present');
      const keyserverID: string = optionalKeyserverID;
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
    const optionalKeyserverID = extractKeyserverIDFromID(input.threadID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    const keyserverID: string = optionalKeyserverID;
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
