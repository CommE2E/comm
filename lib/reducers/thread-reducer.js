// @flow

import _isEqual from 'lodash/fp/isEqual';

import {
  setThreadUnreadStatusActionTypes,
  updateActivityActionTypes,
} from '../actions/activity-actions';
import { saveMessagesActionType } from '../actions/message-actions';
import {
  sendReportActionTypes,
  sendReportsActionTypes,
} from '../actions/report-actions';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
} from '../actions/thread-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
  updateSubscriptionActionTypes,
} from '../actions/user-actions';
import type { BaseAction } from '../types/redux-types';
import {
  type ClientThreadInconsistencyReportCreationRequest,
  reportTypes,
} from '../types/report-types';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import type { RawThreadInfo, ThreadStore } from '../types/thread-types';
import {
  updateTypes,
  type ClientUpdateInfo,
  processUpdatesActionType,
} from '../types/update-types';
import { actionLogger } from '../utils/action-logger';
import { setNewSessionActionType } from '../utils/action-utils';
import { getConfig } from '../utils/config';
import { sanitizeActionSecrets } from '../utils/sanitization';

function reduceThreadUpdates(
  threadInfos: { [id: string]: RawThreadInfo },
  payload: {
    +updatesResult: { +newUpdates: $ReadOnlyArray<ClientUpdateInfo> },
  },
): { [id: string]: RawThreadInfo } {
  const newState = { ...threadInfos };
  let someThreadUpdated = false;
  for (const update of payload.updatesResult.newUpdates) {
    if (
      (update.type === updateTypes.UPDATE_THREAD ||
        update.type === updateTypes.JOIN_THREAD) &&
      !_isEqual(threadInfos[update.threadInfo.id])(update.threadInfo)
    ) {
      someThreadUpdated = true;
      newState[update.threadInfo.id] = update.threadInfo;
    } else if (
      update.type === updateTypes.UPDATE_THREAD_READ_STATUS &&
      threadInfos[update.threadID] &&
      threadInfos[update.threadID].currentUser.unread !== update.unread
    ) {
      someThreadUpdated = true;
      newState[update.threadID] = {
        ...threadInfos[update.threadID],
        currentUser: {
          ...threadInfos[update.threadID].currentUser,
          unread: update.unread,
        },
      };
    } else if (
      update.type === updateTypes.DELETE_THREAD &&
      threadInfos[update.threadID]
    ) {
      someThreadUpdated = true;
      delete newState[update.threadID];
    } else if (update.type === updateTypes.DELETE_ACCOUNT) {
      for (const threadID in threadInfos) {
        const threadInfo = threadInfos[threadID];
        const newMembers = threadInfo.members.filter(
          (member) => member.id !== update.deletedUserID,
        );
        if (newMembers.length < threadInfo.members.length) {
          someThreadUpdated = true;
          newState[threadID] = {
            ...threadInfo,
            members: newMembers,
          };
        }
      }
    }
  }
  if (!someThreadUpdated) {
    return threadInfos;
  }
  return newState;
}

const emptyArray = [];
function findInconsistencies(
  action: BaseAction,
  beforeStateCheck: { [id: string]: RawThreadInfo },
  afterStateCheck: { [id: string]: RawThreadInfo },
): ClientThreadInconsistencyReportCreationRequest[] {
  if (_isEqual(beforeStateCheck)(afterStateCheck)) {
    return emptyArray;
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
    },
  ];
}

export default function reduceThreadInfos(
  state: ThreadStore,
  action: BaseAction,
): ThreadStore {
  if (
    action.type === logInActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === resetPasswordActionTypes.success ||
    action.type === fullStateSyncActionType
  ) {
    if (_isEqual(state.threadInfos)(action.payload.threadInfos)) {
      return state;
    }
    return {
      threadInfos: action.payload.threadInfos,
      inconsistencyReports: state.inconsistencyReports,
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    if (Object.keys(state.threadInfos).length === 0) {
      return state;
    }
    return {
      threadInfos: {},
      inconsistencyReports: state.inconsistencyReports,
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
    if (action.payload.updatesResult.newUpdates.length === 0) {
      return state;
    }
    return {
      threadInfos: reduceThreadUpdates(state.threadInfos, action.payload),
      inconsistencyReports: state.inconsistencyReports,
    };
  } else if (action.type === updateSubscriptionActionTypes.success) {
    const newThreadInfos = {
      ...state.threadInfos,
      [action.payload.threadID]: {
        ...state.threadInfos[action.payload.threadID],
        currentUser: {
          ...state.threadInfos[action.payload.threadID].currentUser,
          subscription: action.payload.subscription,
        },
      },
    };
    return {
      threadInfos: newThreadInfos,
      inconsistencyReports: state.inconsistencyReports,
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
      return {
        threadInfos: {
          ...state.threadInfos,
          ...changedThreadInfos,
        },
        inconsistencyReports: state.inconsistencyReports,
      };
    }
  } else if (
    (action.type === sendReportActionTypes.success ||
      action.type === sendReportsActionTypes.success) &&
    action.payload
  ) {
    const { payload } = action;
    const updatedReports = state.inconsistencyReports.filter(
      (response) => !payload.reports.includes(response),
    );
    if (updatedReports.length === state.inconsistencyReports.length) {
      return state;
    }
    return {
      threadInfos: state.threadInfos,
      inconsistencyReports: updatedReports,
    };
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      (candidate) => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return state;
    }
    const { rawThreadInfos, deleteThreadIDs } = checkStateRequest.stateChanges;
    if (!rawThreadInfos && !deleteThreadIDs) {
      return state;
    }

    const newThreadInfos = { ...state.threadInfos };
    if (rawThreadInfos) {
      for (const rawThreadInfo of rawThreadInfos) {
        newThreadInfos[rawThreadInfo.id] = rawThreadInfo;
      }
    }
    if (deleteThreadIDs) {
      for (const deleteThreadID of deleteThreadIDs) {
        delete newThreadInfos[deleteThreadID];
      }
    }

    const newInconsistencies = findInconsistencies(
      action,
      state.threadInfos,
      newThreadInfos,
    );
    return {
      threadInfos: newThreadInfos,
      inconsistencyReports: [
        ...state.inconsistencyReports,
        ...newInconsistencies,
      ],
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
      return state;
    }
    return {
      threadInfos: { ...state.threadInfos, ...updatedThreadInfos },
      inconsistencyReports: state.inconsistencyReports,
    };
  } else if (action.type === setThreadUnreadStatusActionTypes.started) {
    const { threadID, unread } = action.payload;
    return {
      ...state,
      threadInfos: {
        ...state.threadInfos,
        [threadID]: {
          ...state.threadInfos[threadID],
          currentUser: {
            ...state.threadInfos[threadID].currentUser,
            unread,
          },
        },
      },
    };
  } else if (action.type === setThreadUnreadStatusActionTypes.success) {
    const { threadID, resetToUnread } = action.payload;
    const currentUser = state.threadInfos[threadID].currentUser;

    if (!resetToUnread || currentUser.unread) {
      return state;
    }

    const updatedUser = {
      ...currentUser,
      unread: true,
    };
    return {
      ...state,
      threadInfos: {
        ...state.threadInfos,
        [threadID]: {
          ...state.threadInfos[threadID],
          currentUser: updatedUser,
        },
      },
    };
  }
  return state;
}
