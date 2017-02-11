// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { UserInfo } from '../types/user-types';

import invariant from 'invariant';

export default function reduceUserInfo<T: BaseAppState>(
  state: ?UserInfo,
  action: BaseAction<T>,
) {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return null;
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "RESET_PASSWORD_SUCCESS"
  ) {
    return action.payload.userInfo;
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
