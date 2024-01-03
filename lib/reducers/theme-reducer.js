// @flow

import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import { updateThemeInfoActionType } from '../actions/theme-actions.js';
import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
  tempIdentityLoginActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  defaultGlobalThemeInfo,
  type GlobalThemeInfo,
} from '../types/theme-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

export default function reduceGlobalThemeInfo(
  state: GlobalThemeInfo,
  action: BaseAction,
): GlobalThemeInfo {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === tempIdentityLoginActionTypes.success
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
    action.type === deleteKeyserverAccountActionTypes.success
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
