// @flow

import { setDataLoadedActionType } from '../actions/client-db-store-actions.js';
import {
  keyserverAuthActionTypes,
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

export default function reduceDataLoaded(
  state: boolean,
  action: BaseAction,
): boolean {
  if (action.type === setDataLoadedActionType) {
    return action.payload.dataLoaded;
  } else if (action.type === logInActionTypes.success) {
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
  } else if (action.type === keyserverAuthActionTypes.success) {
    if (ashoatKeyserverID in action.payload.updatesCurrentAsOf) {
      return true;
    }
  }
  return state;
}
