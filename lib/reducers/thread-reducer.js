// @flow

import {
  setThreadUnreadStatusActionTypes,
  updateActivityActionTypes,
} from '../actions/activity-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { saveMessagesActionType } from '../actions/message-actions.js';
import { legacySiweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  modifyCommunityRoleActionTypes,
  deleteCommunityRoleActionTypes,
} from '../actions/thread-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import {
  keyserverAuthActionTypes,
  deleteKeyserverAccountActionTypes,
  legacyLogInActionTypes,
  legacyKeyserverRegisterActionTypes,
  updateSubscriptionActionTypes,
} from '../actions/user-actions.js';
import {
  getThreadIDsForKeyservers,
  extractKeyserverIDFromID,
} from '../keyserver-conn/keyserver-call-utils.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import {
  type ThreadStoreOperation,
  threadStoreOpsHandlers,
} from '../ops/thread-store-ops.js';
import { stateSyncSpecs } from '../shared/state-sync/state-sync-specs.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import { processDMOpsActionType } from '../types/dm-ops.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { type ClientThreadInconsistencyReportCreationRequest } from '../types/report-types.js';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  stateSyncPayloadTypes,
} from '../types/socket-types.js';
import type { RawThreadInfos, ThreadStore } from '../types/thread-types.js';
import {
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';

const { processStoreOperations: processThreadStoreOperations } =
  threadStoreOpsHandlers;

function generateOpsForThreadUpdates(
  threadInfos: RawThreadInfos,
  newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
): $ReadOnlyArray<ThreadStoreOperation> {
  return newUpdates
    .map(update =>
      updateSpecs[update.type].generateOpsForThreadUpdates?.(
        threadInfos,
        update,
      ),
    )
    .filter(Boolean)
    .flat();
}

type ReduceThreadInfosResult = {
  threadStore: ThreadStore,
  newThreadInconsistencies: $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
};

function handleFullStateSync(
  state: ThreadStore,
  keyserverID: string,
  newThreadInfos: RawThreadInfos,
): ReduceThreadInfosResult {
  const threadsToRemove = Object.keys(state.threadInfos).filter(
    key => extractKeyserverIDFromID(key) === keyserverID,
  );
  const threadStoreOperations = [
    {
      type: 'remove',
      payload: { ids: threadsToRemove },
    },
    ...Object.keys(newThreadInfos).map((id: string) => ({
      type: 'replace',
      payload: { id, threadInfo: newThreadInfos[id] },
    })),
  ];
  const updatedThreadStore = processThreadStoreOperations(
    state,
    threadStoreOperations,
  );
  return {
    threadStore: updatedThreadStore,
    newThreadInconsistencies: [],
    threadStoreOperations,
  };
}

function reduceThreadInfos(
  state: ThreadStore,
  action: BaseAction,
): ReduceThreadInfosResult {
  if (action.type === fullStateSyncActionType) {
    return handleFullStateSync(
      state,
      action.payload.keyserverID,
      action.payload.threadInfos,
    );
  } else if (
    action.type === fetchPendingUpdatesActionTypes.success &&
    action.payload.type === stateSyncPayloadTypes.FULL
  ) {
    return handleFullStateSync(
      state,
      action.payload.keyserverID,
      action.payload.threadInfos,
    );
  } else if (
    action.type === legacyLogInActionTypes.success ||
    action.type === legacySiweAuthActionTypes.success ||
    action.type === legacyKeyserverRegisterActionTypes.success
  ) {
    const newThreadInfos = action.payload.threadInfos;
    const threadStoreOperations = [
      {
        type: 'remove_all',
      },
      ...Object.keys(newThreadInfos).map((id: string) => ({
        type: 'replace',
        payload: { id, threadInfo: newThreadInfos[id] },
      })),
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === keyserverAuthActionTypes.success) {
    const keyserverIDs = Object.keys(action.payload.updatesCurrentAsOf);
    const threadIDsToRemove = getThreadIDsForKeyservers(
      Object.keys(state.threadInfos),
      keyserverIDs,
    );
    const newThreadInfos = action.payload.threadInfos;

    const threadStoreOperations = [
      {
        type: 'remove',
        payload: { ids: threadIDsToRemove },
      },
      ...Object.keys(newThreadInfos).map((id: string) => ({
        type: 'replace',
        payload: { id, threadInfo: newThreadInfos[id] },
      })),
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const threadIDsToRemove = getThreadIDsForKeyservers(
      Object.keys(state.threadInfos),
      action.payload.keyserverIDs,
    );

    if (threadIDsToRemove.length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }

    const threadStoreOperations = [
      {
        type: 'remove',
        payload: { ids: threadIDsToRemove },
      },
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    const threadIDsToRemove = getThreadIDsForKeyservers(
      Object.keys(state.threadInfos),
      [action.payload.keyserverID],
    );

    if (threadIDsToRemove.length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }

    const threadStoreOperations = [
      {
        type: 'remove',
        payload: { ids: threadIDsToRemove },
      },
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
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
    const { newUpdates } = action.payload.updatesResult;
    if (newUpdates.length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }
    const threadStoreOperations = generateOpsForThreadUpdates(
      state.threadInfos,
      newUpdates,
    );
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (
    action.type === fetchPendingUpdatesActionTypes.success &&
    action.payload.type === stateSyncPayloadTypes.INCREMENTAL
  ) {
    const { newUpdates } = action.payload.updatesResult;
    if (newUpdates.length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }
    const threadStoreOperations = generateOpsForThreadUpdates(
      state.threadInfos,
      newUpdates,
    );
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === updateSubscriptionActionTypes.success) {
    const { threadID, subscription } = action.payload;
    const threadInfo = state.threadInfos[threadID];
    const newThreadInfo = {
      ...threadInfo,
      currentUser: {
        ...threadInfo.currentUser,
        subscription,
      },
    };
    const threadStoreOperations = [
      {
        type: 'replace',
        payload: {
          id: threadID,
          threadInfo: newThreadInfo,
        },
      },
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === saveMessagesActionType) {
    const threadIDToMostRecentTime = new Map<string, number>();
    for (const messageInfo of action.payload.rawMessageInfos) {
      const current = threadIDToMostRecentTime.get(messageInfo.threadID);
      if (!current || current < messageInfo.time) {
        threadIDToMostRecentTime.set(messageInfo.threadID, messageInfo.time);
      }
    }
    const changedThreadInfos: { [string]: RawThreadInfo } = {};
    for (const [threadID, mostRecentTime] of threadIDToMostRecentTime) {
      const threadInfo = state.threadInfos[threadID];
      if (
        !threadInfo ||
        threadInfo.currentUser.unread ||
        action.payload.updatesCurrentAsOf > mostRecentTime
      ) {
        continue;
      }
      changedThreadInfos[threadID] = {
        ...threadInfo,
        currentUser: {
          ...threadInfo.currentUser,
          unread: true,
        },
      };
    }
    if (Object.keys(changedThreadInfos).length !== 0) {
      const threadStoreOperations = Object.keys(changedThreadInfos).map(id => ({
        type: 'replace',
        payload: {
          id,
          threadInfo: changedThreadInfos[id],
        },
      }));
      const updatedThreadStore = processThreadStoreOperations(
        state,
        threadStoreOperations,
      );
      return {
        threadStore: updatedThreadStore,
        newThreadInconsistencies: [],
        threadStoreOperations,
      };
    }
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }
    const { rawThreadInfos, deleteThreadIDs } = checkStateRequest.stateChanges;
    if (!rawThreadInfos && !deleteThreadIDs) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }

    const threadStoreOperations: ThreadStoreOperation[] = [];
    if (rawThreadInfos) {
      for (const rawThreadInfo of rawThreadInfos) {
        threadStoreOperations.push({
          type: 'replace',
          payload: {
            id: rawThreadInfo.id,
            threadInfo: rawThreadInfo,
          },
        });
      }
    }
    if (deleteThreadIDs) {
      threadStoreOperations.push({
        type: 'remove',
        payload: {
          ids: deleteThreadIDs,
        },
      });
    }

    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );

    const newThreadInconsistencies =
      stateSyncSpecs.threads.findStoreInconsistencies(
        action,
        state.threadInfos,
        updatedThreadStore.threadInfos,
      );

    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies,
      threadStoreOperations,
    };
  } else if (action.type === updateActivityActionTypes.success) {
    const updatedThreadInfos: { [string]: RawThreadInfo } = {};
    for (const setToUnread of action.payload.result.unfocusedToUnread) {
      const threadInfo = state.threadInfos[setToUnread];
      if (threadInfo && !threadInfo.currentUser.unread) {
        updatedThreadInfos[setToUnread] = {
          ...threadInfo,
          currentUser: {
            ...threadInfo.currentUser,
            unread: true,
          },
        };
      }
    }
    if (Object.keys(updatedThreadInfos).length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }
    const threadStoreOperations = Object.keys(updatedThreadInfos).map(id => ({
      type: 'replace',
      payload: {
        id,
        threadInfo: updatedThreadInfos[id],
      },
    }));
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === setThreadUnreadStatusActionTypes.started) {
    const { threadID, unread } = action.payload;
    const threadInfo = state.threadInfos[threadID];
    const updatedThreadInfo = {
      ...threadInfo,
      currentUser: {
        ...threadInfo.currentUser,
        unread,
      },
    };
    const threadStoreOperations = [
      {
        type: 'replace',
        payload: {
          id: threadID,
          threadInfo: updatedThreadInfo,
        },
      },
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === setThreadUnreadStatusActionTypes.success) {
    const { threadID, resetToUnread } = action.payload;
    const threadInfo = state.threadInfos[threadID];
    const { currentUser } = threadInfo;

    if (!resetToUnread || currentUser.unread) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }

    const updatedThread = {
      ...threadInfo,
      currentUser: { ...currentUser, unread: true },
    };
    const threadStoreOperations = [
      {
        type: 'replace',
        payload: {
          id: threadID,
          threadInfo: updatedThread,
        },
      },
    ];
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  } else if (action.type === setClientDBStoreActionType) {
    return {
      threadStore: action.payload.threadStore ?? state,
      newThreadInconsistencies: [],
      threadStoreOperations: [],
    };
  } else if (action.type === processDMOpsActionType) {
    const { updateInfos } = action.payload;
    if (updateInfos.length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }
    const threadStoreOperations = generateOpsForThreadUpdates(
      state.threadInfos,
      updateInfos,
    );
    const updatedThreadStore = processThreadStoreOperations(
      state,
      threadStoreOperations,
    );
    return {
      threadStore: updatedThreadStore,
      newThreadInconsistencies: [],
      threadStoreOperations,
    };
  }
  return {
    threadStore: state,
    newThreadInconsistencies: [],
    threadStoreOperations: [],
  };
}

export { reduceThreadInfos };
