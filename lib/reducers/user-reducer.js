// @flow

import type { BaseAction } from '../types/redux-types';
import type { CurrentUserInfo, UserInfo, UserInfos } from '../types/user-types';
import { updateTypes, processUpdatesActionType } from '../types/update-types';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';

import invariant from 'invariant';
import _keyBy from 'lodash/fp/keyBy';
import _isEqual from 'lodash/fp/isEqual';

import { setNewSessionActionType } from '../utils/action-utils';
import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
  createEntryActionTypes,
  saveEntryActionTypes,
  deleteEntryActionTypes,
  restoreEntryActionTypes,
} from '../actions/entry-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
  resetPasswordActionTypes,
  changeUserSettingsActionTypes,
  searchUsersActionTypes,
} from '../actions/user-actions';
import { joinThreadActionTypes } from '../actions/thread-actions';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
} from '../actions/message-actions';

function reduceCurrentUserInfo(
  state: ?CurrentUserInfo,
  action: BaseAction,
): ?CurrentUserInfo {
  if (
    action.type === logInActionTypes.success ||
    action.type === resetPasswordActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    if (!_isEqual(action.payload.currentUserInfo)(state)) {
      return action.payload.currentUserInfo;
    }
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo
  ) {
    const { sessionChange } = action.payload;
    if (!_isEqual(sessionChange.currentUserInfo)(state)) {
      return sessionChange.currentUserInfo;
    }
  } else if (action.type === fullStateSyncActionType) {
    const { currentUserInfo } = action.payload;
    if (!_isEqual(currentUserInfo)(state)) {
      return currentUserInfo;
    }
  } else if (
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    for (let update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.UPDATE_CURRENT_USER &&
        !_isEqual(update.currentUserInfo)(state)
      ) {
        return update.currentUserInfo;
      }
    }
  } else if (action.type === changeUserSettingsActionTypes.success) {
    invariant(
      state && !state.anonymous,
      "can't change settings if not logged in",
    );
    const email = action.payload.email;
    if (!email) {
      return state;
    }
    return {
      id: state.id,
      username: state.username,
      email: email,
      emailVerified: false,
    };
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (
      checkStateRequest &&
      checkStateRequest.stateChanges &&
      checkStateRequest.stateChanges.currentUserInfo &&
      !_isEqual(checkStateRequest.stateChanges.currentUserInfo)(state)
    ) {
      return checkStateRequest.stateChanges.currentUserInfo;
    }
  }
  return state;
}

function reduceUserInfos(
  state: { [id: string]: UserInfo },
  action: BaseAction,
): UserInfos {
  if (
    action.type === joinThreadActionTypes.success ||
    action.type === fetchMessagesBeforeCursorActionTypes.success ||
    action.type === fetchMostRecentMessagesActionTypes.success ||
    action.type === fetchEntriesActionTypes.success ||
    action.type === updateCalendarQueryActionTypes.success ||
    action.type === searchUsersActionTypes.success
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    // $FlowFixMe should be fixed in flow-bin@0.115 / react-native@0.63
    const updated = { ...state, ...newUserInfos };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    if (Object.keys(state).length === 0) {
      return state;
    }
    return {};
  } else if (
    action.type === logInActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === resetPasswordActionTypes.success ||
    action.type === fullStateSyncActionType
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    if (!_isEqual(state)(newUserInfos)) {
      return newUserInfos;
    }
  } else if (
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.userInfos,
    );
    // $FlowFixMe should be fixed in flow-bin@0.115 / react-native@0.63
    const updated = { ...state, ...newUserInfos };
    for (let update of action.payload.updatesResult.newUpdates) {
      if (update.type === updateTypes.DELETE_ACCOUNT) {
        delete updated[update.deletedUserID];
      }
    }
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (
    action.type === createEntryActionTypes.success ||
    action.type === saveEntryActionTypes.success ||
    action.type === restoreEntryActionTypes.success
  ) {
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      action.payload.updatesResult.userInfos,
    );
    // $FlowFixMe should be fixed in flow-bin@0.115 / react-native@0.63
    const updated = { ...state, ...newUserInfos };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (action.type === deleteEntryActionTypes.success && action.payload) {
    const { updatesResult } = action.payload;
    const newUserInfos = _keyBy(userInfo => userInfo.id)(
      updatesResult.userInfos,
    );
    // $FlowFixMe should be fixed in flow-bin@0.115 / react-native@0.63
    const updated = { ...state, ...newUserInfos };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (action.type === processServerRequestsActionType) {
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return state;
    }
    const { userInfos, deleteUserInfoIDs } = checkStateRequest.stateChanges;
    if (!userInfos && !deleteUserInfoIDs) {
      return state;
    }

    const newUserInfos = { ...state };
    if (userInfos) {
      for (const userInfo of userInfos) {
        newUserInfos[userInfo.id] = userInfo;
      }
    }
    if (deleteUserInfoIDs) {
      for (const deleteUserInfoID of deleteUserInfoIDs) {
        delete newUserInfos[deleteUserInfoID];
      }
    }
    return newUserInfos;
  }
  return state;
}

export { reduceCurrentUserInfo, reduceUserInfos };
