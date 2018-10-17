// @flow

import type { BaseAction } from '../types/redux-types';
import type { RawThreadInfo, ThreadStore } from '../types/thread-types';
import { type PingResult, pingResponseTypes  } from '../types/ping-types';
import { updateTypes, type UpdateInfo } from '../types/update-types';
import {
  type ThreadInconsistencyClientResponse,
  serverRequestTypes,
} from '../types/request-types';

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import { setNewSessionActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
  updateSubscriptionActionTypes,
} from '../actions/user-actions';
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
  pingActionTypes,
  updateActivityActionTypes,
} from '../actions/ping-actions';
import { saveMessagesActionType } from '../actions/message-actions';
import { getConfig } from '../utils/config';
import { reduxLogger } from '../utils/redux-logger';
import { sanitizeAction } from '../utils/sanitization';

// If the user goes away for a while and the server stops keeping track of their
// session, the server will send down the full current set of threadInfos
function reduceFullState(
  threadInfos: {[id: string]: RawThreadInfo},
  payload: PingResult,
): {[id: string]: RawThreadInfo} {
  if (
    payload.type !== pingResponseTypes.FULL ||
    _isEqual(threadInfos)(payload.threadInfos)
  ) {
    return threadInfos;
  }
  const newThreadInfos = {};
  let threadIDsWithNewMessages: ?Set<string> = null;
  const getThreadIDsWithNewMessages = () => {
    if (threadIDsWithNewMessages) {
      return threadIDsWithNewMessages;
    }
    threadIDsWithNewMessages = new Set();
    for (let rawMessageInfo of payload.messagesResult.messageInfos) {
      threadIDsWithNewMessages.add(rawMessageInfo.threadID);
    }
    return threadIDsWithNewMessages;
  };
  for (let threadID in payload.threadInfos) {
    const newThreadInfo = payload.threadInfos[threadID];
    const currentThreadInfo = threadInfos[threadID];
    const prevThreadInfo = payload.prevState.threadInfos[threadID];
    if (_isEqual(currentThreadInfo)(newThreadInfo)) {
      newThreadInfos[threadID] = currentThreadInfo;
    } else if (_isEqual(prevThreadInfo)(newThreadInfo)) {
      // If the thread at the time of the start of the ping is the same as
      // what was returned, but the current state is different, then it's
      // likely that an action mutated the state after the ping result was
      // fetched on the server. We should keep the mutated (current) state.
      if (currentThreadInfo) {
        newThreadInfos[threadID] = currentThreadInfo;
      }
    } else if (
      newThreadInfo.currentUser.unread &&
      currentThreadInfo &&
      !currentThreadInfo.currentUser.unread &&
      !getThreadIDsWithNewMessages().has(threadID)
    ) {
      // To make sure the unread status doesn't update from a stale ping
      // result, we check if there actually are any new messages for this
      // threadInfo.
      const potentiallyNewThreadInfo = {
        ...newThreadInfo,
        currentUser: {
          ...newThreadInfo.currentUser,
          unread: false,
        },
      };
      if (_isEqual(currentThreadInfo)(potentiallyNewThreadInfo)) {
        newThreadInfos[threadID] = currentThreadInfo;
      } else {
        newThreadInfos[threadID] = potentiallyNewThreadInfo;
      }
    } else {
      newThreadInfos[threadID] = newThreadInfo;
    }
  }
  for (let threadID in threadInfos) {
    const newThreadInfo = payload.threadInfos[threadID];
    if (newThreadInfo) {
      continue;
    }
    const prevThreadInfo = payload.prevState.threadInfos[threadID];
    if (prevThreadInfo) {
      continue;
    }
    // If a thread was not present at the start of the ping, it's possible
    // that an action added it in between the start and the end of the ping.
    const currentThreadInfo = threadInfos[threadID];
    newThreadInfos[threadID] = currentThreadInfo;
  }
  if (_isEqual(threadInfos)(newThreadInfos)) {
    return threadInfos;
  }
  return newThreadInfos;
}

function reduceThreadUpdates(
  threadInfos: {[id: string]: RawThreadInfo},
  payload: { +updatesResult: { newUpdates: $ReadOnlyArray<UpdateInfo> } },
): {[id: string]: RawThreadInfo} {
  const newState = { ...threadInfos };
  let someThreadUpdated = false;
  for (let update of payload.updatesResult.newUpdates) {
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
      for (let threadID in threadInfos) {
        const threadInfo = threadInfos[threadID];
        const newMembers = threadInfo.members.filter(
          member => member.id !== update.deletedUserID,
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
  beforeAction: {[id: string]: RawThreadInfo},
  action: BaseAction,
  oldResult: {[id: string]: RawThreadInfo},
  newResult: {[id: string]: RawThreadInfo},
): ThreadInconsistencyClientResponse[] {
  if (_isEqual(oldResult)(newResult)) {
    return emptyArray;
  }
  if (action.type === pingActionTypes.success) {
    if (action.payload.type === pingResponseTypes.FULL) {
      // We can get a memory leak if we include a previous
      // EntryInconsistencyClientResponse in this one
      action = {
        type: "PING_SUCCESS",
        loadingInfo: action.loadingInfo,
        payload: {
          ...action.payload,
          requests: {
            ...action.payload.requests,
            deliveredClientResponses: [],
          },
        },
      };
    } else {
      // This is a separate condition because of Flow
      action = {
        type: "PING_SUCCESS",
        loadingInfo: action.loadingInfo,
        payload: {
          ...action.payload,
          requests: {
            ...action.payload.requests,
            deliveredClientResponses: [],
          },
        },
      };
    }
  }
  return [{
    type: serverRequestTypes.THREAD_INCONSISTENCY,
    platformDetails: getConfig().platformDetails,
    beforeAction,
    action: sanitizeAction(action),
    pollResult: oldResult,
    pushResult: newResult,
    lastActionTypes: reduxLogger.interestingActionTypes,
    time: Date.now(),
  }];
}

export default function reduceThreadInfos(
  state: ThreadStore,
  action: BaseAction,
): ThreadStore {
  if (
    action.type === logInActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === resetPasswordActionTypes.success
  ) {
    if (_isEqual(state.threadInfos)(action.payload.threadInfos)) {
      return state;
    }
    return {
      threadInfos: action.payload.threadInfos,
      inconsistencyResponses: state.inconsistencyResponses,
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
      inconsistencyResponses: state.inconsistencyResponses,
    };
  } else if (
    action.type === joinThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success ||
    action.type === deleteThreadActionTypes.success ||
    action.type === changeThreadSettingsActionTypes.success ||
    action.type === removeUsersFromThreadActionTypes.success ||
    action.type === changeThreadMemberRolesActionTypes.success
  ) {
    if (
      _isEqual(state.threadInfos)(action.payload.threadInfos) &&
      action.payload.updatesResult.newUpdates.length === 0
    ) {
      return state;
    }
    const oldResult = action.payload.threadInfos;
    const newResult = reduceThreadUpdates(state.threadInfos, action.payload);
    return {
      threadInfos: oldResult,
      inconsistencyResponses: [
        ...state.inconsistencyResponses,
        ...findInconsistencies(
          state.threadInfos,
          action,
          oldResult,
          newResult,
        ),
      ],
    };
  } else if (action.type === pingActionTypes.success) {
    const payload = action.payload;

    let newInconsistencies = [], newThreadInfos;
    if (payload.type === pingResponseTypes.FULL) {
      newThreadInfos = reduceFullState(state.threadInfos, payload);
    } else {
      const updateResult = reduceThreadUpdates(state.threadInfos, payload);
      const checkStateRequest = payload.requests.serverRequests.find(
        candidate => candidate.type === serverRequestTypes.CHECK_STATE,
      );
      if (
        !checkStateRequest ||
        !checkStateRequest.stateChanges ||
        !checkStateRequest.stateChanges.rawThreadInfos
      ) {
        newThreadInfos = updateResult;
      } else {
        const { rawThreadInfos } = checkStateRequest.stateChanges;
        newThreadInfos = { ...updateResult };
        for (let rawThreadInfo of rawThreadInfos) {
          newThreadInfos[rawThreadInfo.id] = rawThreadInfo;
        }
        newInconsistencies = findInconsistencies(
          state.threadInfos,
          action,
          updateResult,
          newThreadInfos,
        );
      }
    }

    return {
      threadInfos: newThreadInfos,
      inconsistencyResponses: [
        ...state.inconsistencyResponses.filter(
          response =>
            !payload.requests.deliveredClientResponses.includes(response),
        ),
        ...newInconsistencies,
      ],
    };
  } else if (action.type === newThreadActionTypes.success) {
    const newThreadInfo = action.payload.newThreadInfo;
    if (
      _isEqual(state.threadInfos[newThreadInfo.id])(newThreadInfo) &&
      action.payload.updatesResult.newUpdates.length === 0
    ) {
      return state;
    }
    const oldResult = {
      ...state.threadInfos,
      [newThreadInfo.id]: newThreadInfo,
    };
    const newResult = reduceThreadUpdates(state.threadInfos, action.payload);
    return {
      threadInfos: oldResult,
      inconsistencyResponses: [
        ...state.inconsistencyResponses,
        ...findInconsistencies(
          state.threadInfos,
          action,
          oldResult,
          newResult,
        ),
      ],
    };
  } else if (action.type === updateActivityActionTypes.success) {
    const newThreadInfos = { ...state.threadInfos };
    for (let setToUnread of action.payload.unfocusedToUnread) {
      const threadInfo = newThreadInfos[setToUnread];
      if (threadInfo) {
        threadInfo.currentUser.unread = true;
      }
    }
    return {
      threadInfos: newThreadInfos,
      inconsistencyResponses: state.inconsistencyResponses,
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
      inconsistencyResponses: state.inconsistencyResponses,
    };
  } else if (action.type === saveMessagesActionType) {
    const threadIDToMostRecentTime = new Map();
    for (let messageInfo of action.payload.rawMessageInfos) {
      const current = threadIDToMostRecentTime.get(messageInfo.threadID);
      if (!current || current < messageInfo.time) {
        threadIDToMostRecentTime.set(messageInfo.threadID, messageInfo.time);
      }
    }
    const changedThreadInfos = {};
    for (let [threadID, mostRecentTime] of threadIDToMostRecentTime) {
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
        inconsistencyResponses: state.inconsistencyResponses,
      };
    }
  }
  return state;
}
