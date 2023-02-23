// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import type { Action } from './redux-setup.js';

const setPrimaryIdentityKeys = 'SET_PRIMARY_IDENTITY_KEYS';
function reducePrimaryIdentityPublicKey(
  state: ?string,
  action: Action,
): ?string {
  if (action.type === setPrimaryIdentityKeys) {
    return action.payload;
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return null;
  }
  return state;
}

export { setPrimaryIdentityKeys, reducePrimaryIdentityPublicKey };
