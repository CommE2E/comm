// @flow
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions';
import type { BaseAction } from '../types/redux-types';
import {
  setNewSessionActionType,
  isSuccessfulAuthType,
} from '../utils/action-utils';

export default function reduceDataLoaded(
  state: boolean,
  action: BaseAction,
): boolean {
  if (isSuccessfulAuthType(action)) {
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
