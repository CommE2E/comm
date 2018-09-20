// @flow

import type { BaseAction } from '../types/redux-types';
import type { CurrentUserInfo, UserInfo } from '../types/user-types';
import { updateTypes } from '../types/update-types';

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
import { pingActionTypes } from '../actions/ping-actions';
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
    if (_isEqual(action.payload.currentUserInfo)(state)) {
      return state;
    }
    return action.payload.currentUserInfo;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.cookieInvalidated
  ) {
    const payload = action.payload;
    if (_isEqual(payload.currentUserInfo)(state)) {
      return state;
    }
    return payload.currentUserInfo;
  } else if (action.type === pingActionTypes.success) {
    const prevCurrentUserInfo = action.payload.prevState.currentUserInfo;
    if (
      !_isEqual(action.payload.currentUserInfo)(state) &&
      !_isEqual(action.payload.currentUserInfo)(prevCurrentUserInfo)
    ) {
      return action.payload.currentUserInfo;
    }
    for (let update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.UPDATE_CURRENT_USER &&
        !_isEqual(update.currentUserInfo)(state)
      ) {
        return update.currentUserInfo;
      }
    }
    return state;
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
  }
  return state;
}

function reduceUserInfos(
  state: {[id: string]: UserInfo},
  action: BaseAction,
) {
  if (
    action.type === joinThreadActionTypes.success ||
    action.type === fetchMessagesBeforeCursorActionTypes.success ||
    action.type === fetchMostRecentMessagesActionTypes.success ||
    action.type === fetchEntriesActionTypes.success ||
    action.type === updateCalendarQueryActionTypes.success ||
    action.type === searchUsersActionTypes.success ||
    (action.type === setNewSessionActionType &&
      !action.payload.cookieInvalidated)
  ) {
    const newUserInfos = _keyBy('id')(action.payload.userInfos);
    const updated = { ...state, ...newUserInfos };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (
    action.type === logInActionTypes.success ||
      action.type === registerActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success ||
      action.type === setNewSessionActionType
  ) {
    const newUserInfos = _keyBy('id')(action.payload.userInfos);
    if (!_isEqual(state)(newUserInfos)) {
      return newUserInfos;
    }
  } else if (action.type === pingActionTypes.success) {
    const prevCurrentUserInfo = action.payload.prevState.currentUserInfo;
    // If user has changed since ping started, don't do anything
    if (
      !prevCurrentUserInfo ||
      action.payload.currentUserInfo.id !== prevCurrentUserInfo.id
    ) {
      return state;
    }
    const newUserInfos = _keyBy('id')(action.payload.userInfos);
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
    const newUserInfos = _keyBy('id')(action.payload.updatesResult.userInfos);
    const updated = { ...state, ...newUserInfos };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (action.type === deleteEntryActionTypes.success && action.payload) {
    const newUserInfos = _keyBy('id')(action.payload.updatesResult.userInfos);
    const updated = { ...state, ...newUserInfos };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  }
  return state;
}

export {
  reduceCurrentUserInfo,
  reduceUserInfos,
};
