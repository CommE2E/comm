// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { CurrentUserInfo, UserInfo } from '../types/user-types';

import invariant from 'invariant';

function reduceCurrentUserInfo(
  state: ?CurrentUserInfo,
  action: BaseAction,
) {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS" ||
      (action.type === "SET_COOKIE" && action.payload.cookieInvalidated)
  ) {
    return null;
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS" ||
      action.type === "PING_SUCCESS"
  ) {
    return action.payload.currentUserInfo;
  } else if (action.type === "REGISTER_SUCCESS") {
    return action.payload;
  } else if (action.type === "CHANGE_USER_SETTINGS_SUCCESS") {
    invariant(state, "can't change settings if not logged in");
    return {
      ...state,
      email: action.payload.email,
    };
  }
  return state;
}

function reduceUserInfos(
  state: {[id: string]: UserInfo},
  action: BaseAction,
) {
  return state;
}

export {
  reduceCurrentUserInfo,
  reduceUserInfos,
};
