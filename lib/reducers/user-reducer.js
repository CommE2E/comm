// @flow

import type { BaseAction } from '../types/redux-types';
import type { CurrentUserInfo, UserInfo } from '../types/user-types';

import invariant from 'invariant';
import _keyBy from 'lodash/fp/keyBy';
import _isEqual from 'lodash/fp/isEqual';

import { setCookieActionType } from '../utils/action-utils';
import {
  fetchEntriesActionTypes,
  fetchEntriesAndSetRangeActionTypes,
  fetchEntriesAndAppendRangeActionTypes,
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
import {
  joinThreadActionTypes,
  subscribeActionTypes,
} from '../actions/thread-actions';
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
    action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success
  ) {
    return action.payload.currentUserInfo;
  } else if (
    action.type === setCookieActionType &&
    action.payload.cookieInvalidated
  ) {
    return action.payload.currentUserInfo;
  } else if (
    action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === pingActionTypes.success
  ) {
    return action.payload.currentUserInfo;
  } else if (action.type === registerActionTypes.success) {
    return action.payload;
  } else if (action.type === changeUserSettingsActionTypes.success) {
    invariant(
      state && !state.anonymous,
      "can't change settings if not logged in",
    );
    return {
      id: state.id,
      username: state.username,
      email: action.payload.email,
      emailVerified: state.emailVerified,
    };
  }
  return state;
}

function reduceUserInfos(
  state: {[id: string]: UserInfo},
  action: BaseAction,
) {
  if (
    action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === pingActionTypes.success ||
      action.type === joinThreadActionTypes.success ||
      action.type === subscribeActionTypes.success ||
      action.type === fetchMessagesBeforeCursorActionTypes.success ||
      action.type === fetchMostRecentMessagesActionTypes.success ||
      action.type === fetchEntriesAndSetRangeActionTypes.success ||
      action.type === fetchEntriesAndAppendRangeActionTypes.success ||
      action.type === fetchEntriesActionTypes.success ||
      action.type === searchUsersActionTypes.success ||
      action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success
  ) {
    const updated = {
      ...state,
      ..._keyBy('id')(action.payload.userInfos),
    };
    if (!_isEqual(state)(updated)) {
      return updated;
    }
  } else if (action.type === setCookieActionType) {
    const updated = {
      ...state,
      ..._keyBy('id')(action.payload.userInfos),
    };
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
