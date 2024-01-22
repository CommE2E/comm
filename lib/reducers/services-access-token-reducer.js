// @flow

import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  setAccessTokenActionType,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

export default function reduceServicesAccessToken(
  state: ?string,
  action: BaseAction,
): ?string {
  if (action.type === setAccessTokenActionType) {
    return action.payload;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.currentUserInfo &&
    action.payload.sessionChange.currentUserInfo.anonymous
  ) {
    return null;
  } else if (
    action.type === logOutActionTypes.started ||
    action.type === logOutActionTypes.success
  ) {
    return null;
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    if (!usingCommServicesAccessToken) {
      return null;
    }
  }
  return state;
}
