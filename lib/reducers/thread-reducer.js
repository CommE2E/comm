// @flow

import type { BaseAction } from '../types/redux-types';
import type { RawThreadInfo } from '../types/thread-types';
import type { PingResult } from '../types/ping-types';
import { updateTypes } from '../types/update-types';

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import { setCookieActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
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

function pingPull(
  state: {[id: string]: RawThreadInfo},
  payload: PingResult,
): {[id: string]: RawThreadInfo} {
  if (_isEqual(state)(payload.threadInfos)) {
    return state;
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
    const currentThreadInfo = state[threadID];
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
  for (let threadID in state) {
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
    const currentThreadInfo = state[threadID];
    newThreadInfos[threadID] = currentThreadInfo;
  }
  if (_isEqual(state)(newThreadInfos)) {
    return state;
  }
  return newThreadInfos;
}

function pingPush(
  state: {[id: string]: RawThreadInfo},
  payload: PingResult,
): {[id: string]: RawThreadInfo} {
  if (!payload.updatesResult) {
    return state;
  }
  const newState = { ...state };
  let someThreadUpdated = false;
  for (let update of payload.updatesResult.newUpdates) {
    if (
      update.type === updateTypes.UPDATE_THREAD &&
      !_isEqual(state[update.threadInfo.id])(update.threadInfo)
    ) {
      someThreadUpdated = true;
      newState[update.threadInfo.id] = update.threadInfo;
    } else if (
      update.type === updateTypes.UPDATE_THREAD_READ_STATUS &&
      state[update.threadID] &&
      state[update.threadID].currentUser.unread !== update.unread
    ) {
      someThreadUpdated = true;
      newState[update.threadID] = {
        ...state[update.threadID],
        currentUser: {
          ...state[update.threadID].currentUser,
          unread: update.unread,
        },
      };
    } else if (
      update.type === updateTypes.DELETE_THREAD &&
      state[update.threadID]
    ) {
      someThreadUpdated = true;
      delete newState[update.threadID];
    }
  }
  if (!someThreadUpdated) {
    return state;
  }
  return newState;
}

export default function reduceThreadInfos(
  state: {[id: string]: RawThreadInfo},
  action: BaseAction,
): {[id: string]: RawThreadInfo} {
  if (
    action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success ||
      action.type === logInActionTypes.success ||
      action.type === registerActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === joinThreadActionTypes.success ||
      action.type === leaveThreadActionTypes.success ||
      action.type === deleteThreadActionTypes.success ||
      action.type === setCookieActionType
  ) {
    if (_isEqual(state)(action.payload.threadInfos)) {
      return state;
    }
    return action.payload.threadInfos;
  } else if (action.type === pingActionTypes.success) {
    const payload = action.payload;
    const pullResult = pingPull(state, payload);
    //const pushResult = pingPush(state, payload);
    return pullResult;
  } else if (
    action.type === changeThreadSettingsActionTypes.success ||
      action.type === removeUsersFromThreadActionTypes.success ||
      action.type === changeThreadMemberRolesActionTypes.success
  ) {
    const newThreadInfo = action.payload.threadInfo;
    if (_isEqual(state[newThreadInfo.id])(newThreadInfo)) {
      return state;
    }
    return {
      ...state,
      [newThreadInfo.id]: newThreadInfo,
    };
  } else if (action.type === newThreadActionTypes.success) {
    const newThreadInfo = action.payload.newThreadInfo;
    if (_isEqual(state[newThreadInfo.id])(newThreadInfo)) {
      return state;
    }
    return {
      ...state,
      [newThreadInfo.id]: newThreadInfo,
    };
  } else if (action.type === updateActivityActionTypes.success) {
    const newState = { ...state };
    for (let setToUnread of action.payload.unfocusedToUnread) {
      const threadInfo = newState[setToUnread];
      if (threadInfo) {
        threadInfo.currentUser.unread = true;
      }
    }
    return newState;
  }
  return state;
}
