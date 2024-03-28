// @flow

import {
  logOutActionTypes,
  setAccessTokenActionType,
  identityLogInActionTypes,
  identityRegisterActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

export default function reduceServicesAccessToken(
  state: ?string,
  action: BaseAction,
): ?string {
  if (action.type === setAccessTokenActionType) {
    return action.payload;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    return null;
  } else if (action.type === logOutActionTypes.started) {
    return null;
  } else if (
    action.type === identityRegisterActionTypes.success ||
    action.type === identityLogInActionTypes.success
  ) {
    return action.payload.accessToken;
  }
  return state;
}
