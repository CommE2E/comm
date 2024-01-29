// @flow

import {
  logOutActionTypes,
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
    action.payload.sessionChange.currentUserInfo.anonymous &&
    !usingCommServicesAccessToken
  ) {
    return null;
  } else if (action.type === logOutActionTypes.started) {
    return null;
  }
  return state;
}
