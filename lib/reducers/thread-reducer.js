// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import {
  setThreadUnreadStatusActionTypes,
  updateActivityActionTypes,
} from '../actions/activity-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { saveMessagesActionType } from '../actions/message-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
  updateSubscriptionActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  type ClientThreadInconsistencyReportCreationRequest,
  reportTypes,
} from '../types/report-types.js';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import type {
  RawThreadInfo,
  ThreadStore,
  ThreadStoreOperation,
} from '../types/thread-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import {
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types.js';
import { actionLogger } from '../utils/action-logger.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { getConfig } from '../utils/config.js';
import { generateReportID } from '../utils/report-utils.js';
import { sanitizeActionSecrets } from '../utils/sanitization.js';

function generateOpsForThreadUpdates(
  threadInfos: { +[id: string]: RawThreadInfo },
  payload: {
    +updatesResult: { +newUpdates: $ReadOnlyArray<ClientUpdateInfo>, ... },
    ...
  },
): $ReadOnlyArray<ThreadStoreOperation> {
  const threadOperations: ThreadStoreOperation[] = [];
  for (const update of payload.updatesResult.newUpdates) {
    if (
      (update.type === updateTypes.UPDATE_THREAD ||
        update.type === updateTypes.JOIN_THREAD) &&
      !_isEqual(threadInfos[update.threadInfo.id])(update.threadInfo)
    ) {
      threadOperations.push({
        type: 'replace',
        payload: {
          id: update.threadInfo.id,
          threadInfo: update.threadInfo,
        },
      });
    } else if (
      update.type === updateTypes.UPDATE_THREAD_READ_STATUS &&
      threadInfos[update.threadID] &&
      threadInfos[update.threadID].currentUser.unread !== update.unread
    ) {
      const updatedThread = {
        ...threadInfos[update.threadID],
        currentUser: {
          ...threadInfos[update.threadID].currentUser,
          unread: update.unread,
        },
      };
      threadOperations.push({
        type: 'replace',
        payload: {
          id: update.threadID,
          threadInfo: updatedThread,
        },
      });
    } else if (
      update.type === updateTypes.DELETE_THREAD &&
      threadInfos[update.threadID]
    ) {
      threadOperations.push({
        type: 'remove',
        payload: {
          ids: [update.threadID],
        },
      });
    } else if (update.type === updateTypes.DELETE_ACCOUNT) {
      for (const threadID in threadInfos) {
        const threadInfo = threadInfos[threadID];
        const newMembers = threadInfo.members.filter(
          member => member.id !== update.deletedUserID,
        );
        if (newMembers.length < threadInfo.members.length) {
          const updatedThread = {
            ...threadInfo,
            members: newMembers,
          };
          threadOperations.push({
            type: 'replace',
            payload: {
              id: threadID,
              threadInfo: updatedThread,
            },
          });
        }
      }
    }
  }
  return threadOperations;
}

function findInconsistencies(
  action: BaseAction,
  beforeStateCheck: { +[id: string]: RawThreadInfo },
  afterStateCheck: { +[id: string]: RawThreadInfo },
): ClientThreadInconsistencyReportCreationRequest[] {
  if (_isEqual(beforeStateCheck)(afterStateCheck)) {
    return [];
  }
  return [
    {
      type: reportTypes.THREAD_INCONSISTENCY,
      platformDetails: getConfig().platformDetails,
      beforeAction: beforeStateCheck,
      action: sanitizeActionSecrets(action),
      pushResult: afterStateCheck,
      lastActions: actionLogger.interestingActionSummaries,
      time: Date.now(),
      id: generateReportID(),
    },
  ];
}

function reduceThreadInfos(
  state: ThreadStore,
  action: BaseAction,
): {
  threadStore: ThreadStore,
  newThreadInconsistencies: $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
} {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === fullStateSyncActionType
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
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    if (Object.keys(state.threadInfos).length === 0) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }
    const threadStoreOperations = [
      {
        type: 'remove_all',
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
    action.type === newThreadActionTypes.success
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
      action.payload,
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
    const newThreadInfo = {
      ...state.threadInfos[threadID],
      currentUser: {
        ...state.threadInfos[threadID].currentUser,
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
    const threadIDToMostRecentTime = new Map();
    for (const messageInfo of action.payload.rawMessageInfos) {
      const current = threadIDToMostRecentTime.get(messageInfo.threadID);
      if (!current || current < messageInfo.time) {
        threadIDToMostRecentTime.set(messageInfo.threadID, messageInfo.time);
      }
    }
    const changedThreadInfos = {};
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
        ...state.threadInfos[threadID],
        currentUser: {
          ...state.threadInfos[threadID].currentUser,
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

    const newThreadInconsistencies = findInconsistencies(
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
    const updatedThreadInfos = {};
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
    const updatedThreadInfo = {
      ...state.threadInfos[threadID],
      currentUser: {
        ...state.threadInfos[threadID].currentUser,
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
    const currentUser = state.threadInfos[threadID].currentUser;

    if (!resetToUnread || currentUser.unread) {
      return {
        threadStore: state,
        newThreadInconsistencies: [],
        threadStoreOperations: [],
      };
    }

    const updatedUser = {
      ...currentUser,
      unread: true,
    };
    const updatedThread = {
      ...state.threadInfos[threadID],
      currentUser: updatedUser,
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
  }
  return {
    threadStore: state,
    newThreadInconsistencies: [],
    threadStoreOperations: [],
  };
}

function processThreadStoreOperations(
  threadStore: ThreadStore,
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
): ThreadStore {
  if (threadStoreOperations.length === 0) {
    return threadStore;
  }
  let processedThreads = { ...threadStore.threadInfos };
  for (const operation of threadStoreOperations) {
    if (operation.type === 'replace') {
      processedThreads[operation.payload.id] = operation.payload.threadInfo;
    } else if (operation.type === 'remove') {
      for (const id of operation.payload.ids) {
        delete processedThreads[id];
      }
    } else if (operation.type === 'remove_all') {
      processedThreads = {};
    }
  }
  return { ...threadStore, threadInfos: processedThreads };
}

export { reduceThreadInfos, processThreadStoreOperations };
