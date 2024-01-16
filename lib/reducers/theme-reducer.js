// @flow

import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import { updateThemeInfoActionType } from '../actions/theme-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  tempIdentityLoginActionTypes,
  keyserverRegisterActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  defaultGlobalThemeInfo,
  type GlobalThemeInfo,
} from '../types/theme-types.js';

export default function reduceGlobalThemeInfo(
  state: GlobalThemeInfo,
  action: BaseAction,
): GlobalThemeInfo {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === tempIdentityLoginActionTypes.success ||
    action.type === keyserverRegisterActionTypes.success
  ) {
    return defaultGlobalThemeInfo;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo &&
    action.payload.sessionChange.currentUserInfo.anonymous
  ) {
    return defaultGlobalThemeInfo;
  } else if (
    action.type === logOutActionTypes.started ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return defaultGlobalThemeInfo;
  } else if (action.type === updateThemeInfoActionType) {
    return {
      ...state,
      ...action.payload,
    };
  }
  return state;
}
