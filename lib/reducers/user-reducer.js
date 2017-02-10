// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { UserInfo } from '../types/user-types';

export default function reduceUserInfo<T: BaseAppState>(
  state: ?UserInfo,
  action: BaseAction<T>,
) {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return null;
  } else if (action.type === "LOG_IN_SUCCESS") {
    return action.payload.userInfo;
  } else if (action.type === "REGISTER_SUCCESS") {
    return action.payload;
  }
  return state;
}
