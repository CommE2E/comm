// @flow

import invariant from 'invariant';

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
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
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import {
  threadActivityStoreOpsHandlers,
  type ThreadActivityStoreOperation,
} from '../ops/thread-activity-store-ops.js';
import { isWebPlatform } from '../types/device-types.js';
import { processDMOpsActionType } from '../types/dm-ops.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  incrementalStateSyncActionType,
  stateSyncPayloadTypes,
} from '../types/socket-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import { updateThreadLastNavigatedActionType } from '../types/thread-activity-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../types/update-types.js';
import { processUpdatesActionType } from '../types/update-types.js';
import { getConfig } from '../utils/config.js';
import { getMessageForException } from '../utils/errors.js';
import { assertObjectsAreEqual } from '../utils/objects.js';

function assertThreadActivityStoresAreEqual(
  processedThreadActivityStore: ThreadActivityStore,
  expectedThreadActivityStore: ThreadActivityStore,
  location: string,
  onStateDifference?: (message: string) => mixed,
) {
  try {
    assertObjectsAreEqual(
      processedThreadActivityStore,
      expectedThreadActivityStore,
      `ThreadActivityStore - ${location}`,
    );
  } catch (e) {
    console.log(
      'Error processing ThreadActivityStore ops',
      processedThreadActivityStore,
      expectedThreadActivityStore,
    );
    const message = `Error processing ThreadActivityStore ops ${
      getMessageForException(e) ?? '{no exception message}'
    }`;
    onStateDifference?.(message);
  }
}

type ReduceThreadActivityResult = {
  +threadActivityStore: ThreadActivityStore,
  +threadActivityStoreOperations: $ReadOnlyArray<ThreadActivityStoreOperation>,
};

function handleThreadDeletionUpdates(
  state: ThreadActivityStore,
  newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
): ReduceThreadActivityResult {
  if (newUpdates.length === 0) {
    return {
      threadActivityStore: state,
      threadActivityStoreOperations: [],
    };
  }

  const deleteThreadUpdates = newUpdates.filter(
    (update: ClientUpdateInfo) => update.type === updateTypes.DELETE_THREAD,
  );
  if (deleteThreadUpdates.length === 0) {
    return {
      threadActivityStore: state,
      threadActivityStoreOperations: [],
    };
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
  return {
    threadActivityStore: processStoreOps(state, [removeOperation]),
    threadActivityStoreOperations: [removeOperation],
  };
}

const { processStoreOperations: processStoreOps } =
  threadActivityStoreOpsHandlers;

function reduceThreadActivity(
  state: ThreadActivityStore,
  action: BaseAction,
  onStateDifference?: (message: string) => mixed,
): ReduceThreadActivityResult {
  if (action.type === updateThreadLastNavigatedActionType) {
    const { threadID, time } = action.payload;
    const replaceOperation = {
      type: 'replace_thread_activity_entry',
      payload: {
        id: threadID,
        threadActivityStoreEntry: {
          ...state[threadID],
          lastNavigatedTo: time,
        },
      },
    };
    return {
      threadActivityStore: processStoreOps(state, [replaceOperation]),
      threadActivityStoreOperations: [replaceOperation],
    };
  } else if (action.type === messageStorePruneActionType) {
    const now = Date.now();
    const replaceOperations = [];
    for (const threadID: string of action.payload.threadIDs) {
      const replaceOperation = {
        type: 'replace_thread_activity_entry',
        payload: {
          id: threadID,
          threadActivityStoreEntry: {
            ...state[threadID],
            lastPruned: now,
          },
        },
      };
      replaceOperations.push(replaceOperation);
    }
    return {
      threadActivityStore: processStoreOps(state, replaceOperations),
      threadActivityStoreOperations: replaceOperations,
    };
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
    return handleThreadDeletionUpdates(
      state,
      action.payload.updatesResult.newUpdates,
    );
  } else if (
    action.type === fetchPendingUpdatesActionTypes.success &&
    action.payload.type === stateSyncPayloadTypes.INCREMENTAL
  ) {
    return handleThreadDeletionUpdates(
      state,
      action.payload.updatesResult.newUpdates,
    );
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const threadIDsToRemove = [];
    const keyserverIDsSet = new Set<string>(action.payload.keyserverIDs);

    for (const threadID in state) {
      const keyserverID = extractKeyserverIDFromIDOptional(threadID);
      if (!keyserverID || !keyserverIDsSet.has(keyserverID)) {
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

    return {
      threadActivityStore: processStoreOps(state, [removeOperation]),
      threadActivityStoreOperations: [removeOperation],
    };
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    const threadIDsToRemove = [];
    const { keyserverID } = action.payload;

    for (const threadID in state) {
      if (extractKeyserverIDFromIDOptional(threadID) !== keyserverID) {
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

    return {
      threadActivityStore: processStoreOps(state, [removeOperation]),
      threadActivityStoreOperations: [removeOperation],
    };
  } else if (action.type === setClientDBStoreActionType) {
    if (!isWebPlatform(getConfig().platformDetails.platform)) {
      assertThreadActivityStoresAreEqual(
        action.payload.threadActivityStore ?? {},
        state,
        action.type,
        onStateDifference,
      );
      return {
        threadActivityStore: state,
        threadActivityStoreOperations: [],
      };
    } else {
      const newThreadActivityStore = action.payload.threadActivityStore;

      if (!newThreadActivityStore) {
        return {
          threadActivityStore: state,
          threadActivityStoreOperations: [],
        };
      }

      const threadActivityStore: ThreadActivityStore = {
        ...state,
        ...newThreadActivityStore,
      };

      return {
        threadActivityStore,
        threadActivityStoreOperations: [],
      };
    }
  } else if (action.type === processDMOpsActionType) {
    return handleThreadDeletionUpdates(state, action.payload.updateInfos);
  }
  return {
    threadActivityStore: state,
    threadActivityStoreOperations: [],
  };
}

export { reduceThreadActivity };
