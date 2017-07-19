// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { CurrentUserInfo, UserInfo } from '../types/user-types';

import invariant from 'invariant';
import _keyBy from 'lodash/fp/keyBy';
import _isEqual from 'lodash/fp/isEqual';

function reduceCurrentUserInfo(
  state: ?CurrentUserInfo,
  action: BaseAction,
): ?CurrentUserInfo {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return action.payload.currentUserInfo;
  } else if (action.type === "SET_COOKIE" && action.payload.cookieInvalidated) {
    return action.payload.currentUserInfo;
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS"
  ) {
    return action.payload.currentUserInfo;
  } else if (action.type === "REGISTER_SUCCESS") {
    return action.payload;
  } else if (action.type === "CHANGE_USER_SETTINGS_SUCCESS") {
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
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS" ||
      action.type === "AUTH_THREAD_SUCCESS" ||
      action.type === "FETCH_MESSAGES_SUCCESS" ||
      action.type === "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS" ||
      action.type === "FETCH_ENTRIES_AND_APPEND_RANGE_SUCCESS" ||
      action.type === "FETCH_ENTRIES_SUCCESS" ||
      action.type === "SEARCH_USERS_SUCCESS"
  ) {
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
