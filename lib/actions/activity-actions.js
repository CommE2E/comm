// @flow

import * as React from 'react';

import {
  extractKeyserverIDFromID,
  extractKeyserverIDFromIDOptional,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type {
  ActivityUpdate,
  ActivityUpdateSuccessPayload,
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../types/activity-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types';
import { useSelector } from '../utils/redux-utils.js';

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
      const optionalKeyserverID = extractKeyserverIDFromIDOptional(
        update.threadID,
      );
      if (!optionalKeyserverID) {
        continue;
      }
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

export type UseSetThreadUnreadStatusInput = {
  +threadInfo: ThreadInfo,
  ...SetThreadUnreadStatusRequest,
};
function useSetThreadUnreadStatus(): (
  input: UseSetThreadUnreadStatusInput,
) => Promise<SetThreadUnreadStatusPayload> {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const keyserverCall = useKeyserverCall(setThreadUnreadStatus);

  return React.useCallback(
    async (input: UseSetThreadUnreadStatusInput) =>
      threadSpecs[input.threadInfo.type].protocol.setThreadUnreadStatus(
        { input, viewerID },
        {
          processAndSendDMOperation,
          keyserverSetThreadUnreadStatus: keyserverCall,
        },
      ),

    [keyserverCall, viewerID, processAndSendDMOperation],
  );
}

export {
  updateActivityActionTypes,
  useUpdateActivity,
  setThreadUnreadStatusActionTypes,
  useSetThreadUnreadStatus,
};
