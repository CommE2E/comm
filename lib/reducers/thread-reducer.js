// @flow

import type { BaseAction } from '../types/redux-types';
import type { RawThreadInfo } from '../types/thread-types';

import invariant from 'invariant';
import _omitBy from 'lodash/fp/omitBy';
import _isEqual from 'lodash/fp/isEqual';

import { setCookieActionType } from '../utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  resetPasswordActionTypes,
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

export default function reduceThreadInfos(
  state: {[id: string]: RawThreadInfo},
  action: BaseAction,
): {[id: string]: RawThreadInfo} {
  if (
    action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success ||
      action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === pingActionTypes.success ||
      action.type === joinThreadActionTypes.success ||
      action.type === leaveThreadActionTypes.success ||
      action.type === setCookieActionType
  ) {
    if (_isEqual(state)(action.payload.threadInfos)) {
      return state;
    }
    return action.payload.threadInfos;
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
  } else if (action.type === deleteThreadActionTypes.success) {
    const threadID = action.payload.threadID;
    return _omitBy((candidate) => candidate.id === threadID)(state);
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
