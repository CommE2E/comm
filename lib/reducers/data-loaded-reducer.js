// @flow

import { siweAuthActionTypes } from '../actions/siwe-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import type { BaseAction } from '../types/redux-types';
import { setNewSessionActionType } from '../utils/action-utils';

export default function reduceDataLoaded(
  state: boolean,
  action: BaseAction,
): boolean {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success
  ) {
    return true;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo &&
    action.payload.sessionChange.currentUserInfo.anonymous
  ) {
    return false;
  } else if (
    action.type === logOutActionTypes.started ||
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return false;
  }
  return state;
}
