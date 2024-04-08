// @flow

import invariant from 'invariant';

import { messageStorePruneActionType } from '../actions/message-actions.js';
import {
  changeThreadMemberRolesActionTypes,
  changeThreadSettingsActionTypes,
  deleteCommunityRoleActionTypes,
  deleteThreadActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  modifyCommunityRoleActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
} from '../actions/thread-actions.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import { threadActivityStoreOpsHandlers } from '../ops/thread-activity-store-ops.js';
import type { BaseAction } from '../types/redux-types.js';
import { incrementalStateSyncActionType } from '../types/socket-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import { updateThreadLastNavigatedActionType } from '../types/thread-activity-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../types/update-types.js';
import { processUpdatesActionType } from '../types/update-types.js';

const { processStoreOperations: processStoreOps } =
  threadActivityStoreOpsHandlers;

function reduceThreadActivity(
  state: ThreadActivityStore,
  action: BaseAction,
): ThreadActivityStore {
  if (action.type === updateThreadLastNavigatedActionType) {
    const { threadID, time } = action.payload;
    const replaceOperation = {
      type: 'replace_thread_activity_entry',
      payload: {
        id: threadID,
        threadActivityStoreEntry: {
          lastNavigatedTo: time,
          lastPruned: state[threadID].lastPruned,
        },
      },
    };
    return processStoreOps(state, [replaceOperation]);
  } else if (action.type === messageStorePruneActionType) {
    const now = Date.now();
    const replaceOperations = [];
    for (const threadID: string of action.payload.threadIDs) {
      const replaceOperation = {
        type: 'replace_thread_activity_entry',
        payload: {
          id: threadID,
          threadActivityStoreEntry: {
            lastNavigatedTo: state[threadID].lastNavigatedTo,
            lastPruned: now,
          },
        },
      };
      replaceOperations.push(replaceOperation);
    }
    return processStoreOps(state, replaceOperations);
  } else if (
    action.type === joinThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success ||
    action.type === deleteThreadActionTypes.success ||
    action.type === changeThreadSettingsActionTypes.success ||
    action.type === removeUsersFromThreadActionTypes.success ||
    action.type === changeThreadMemberRolesActionTypes.success ||
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType ||
    action.type === newThreadActionTypes.success ||
    action.type === modifyCommunityRoleActionTypes.success ||
    action.type === deleteCommunityRoleActionTypes.success
  ) {
    const { newUpdates } = action.payload.updatesResult;
    if (newUpdates.length === 0) {
      return state;
    }

    const deleteThreadUpdates = newUpdates.filter(
      (update: ClientUpdateInfo) => update.type === updateTypes.DELETE_THREAD,
    );
    if (deleteThreadUpdates.length === 0) {
      return state;
    }

    const threadIDsToRemove = [];
    for (const update: ClientUpdateInfo of deleteThreadUpdates) {
      invariant(
        update.type === updateTypes.DELETE_THREAD,
        'update must be of type DELETE_THREAD',
      );
      threadIDsToRemove.push(update.threadID);
    }
    const removeOperation = {
      type: 'remove_thread_activity_entries',
      payload: {
        ids: threadIDsToRemove,
      },
    };
    return processStoreOps(state, [removeOperation]);
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const threadIDsToRemove = [];
    const keyserverIDsSet = new Set<string>(action.payload.keyserverIDs);

    for (const threadID in state) {
      if (!keyserverIDsSet.has(extractKeyserverIDFromID(threadID))) {
        continue;
      }
      threadIDsToRemove.push(threadID);
    }

    const removeOperation = {
      type: 'remove_thread_activity_entries',
      payload: {
        ids: threadIDsToRemove,
      },
    };

    return processStoreOps(state, [removeOperation]);
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    const threadIDsToRemove = [];
    const { keyserverID } = action.payload;

    for (const threadID in state) {
      if (extractKeyserverIDFromID(threadID) !== keyserverID) {
        continue;
      }
      threadIDsToRemove.push(threadID);
    }

    const removeOperation = {
      type: 'remove_thread_activity_entries',
      payload: {
        ids: threadIDsToRemove,
      },
    };

    return processStoreOps(state, [removeOperation]);
  }
  return state;
}

export { reduceThreadActivity };
