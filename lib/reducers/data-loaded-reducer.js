// @flow

import { setDataLoadedActionType } from '../actions/client-db-store-actions.js';
import {
  logOutActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

export default function reduceDataLoaded(
  state: boolean,
  action: BaseAction,
): boolean {
  if (action.type === setDataLoadedActionType) {
    return action.payload.dataLoaded;
  } else if (action.type === legacyLogInActionTypes.success) {
    return true;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    return false;
  } else if (action.type === logOutActionTypes.started) {
    console.log('Logout started, dataLoaded false');
    return false;
  }
  return state;
}
