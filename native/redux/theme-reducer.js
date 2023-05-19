// @flow

import { siweAuthActionTypes } from 'lib/actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import { updateThemeInfoActionType, type Action } from './action-types.js';
import {
  type GlobalThemeInfo,
  defaultGlobalThemeInfo,
} from '../types/themes.js';

export default function reduceGlobalThemeInfo(
  state: GlobalThemeInfo,
  action: Action,
): GlobalThemeInfo {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success
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
