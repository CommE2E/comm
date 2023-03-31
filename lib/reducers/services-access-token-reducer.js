// @flow

import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

export default function reduceServicesAccessToken(
  state: ?string,
  action: BaseAction,
): ?string {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success
  ) {
    return null;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo &&
    action.payload.sessionChange.currentUserInfo.anonymous
  ) {
    return null;
  } else if (
    action.type === logOutActionTypes.started ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return null;
  }
  return state;
}
