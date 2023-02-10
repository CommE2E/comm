// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import type { Action } from './redux-setup.js';

const setPrimaryIdentityPublicKey = 'SET_PRIMARY_IDENTITY_PUBLIC_KEY';
function reducePrimaryIdentityPublicKey(
  state: ?string,
  action: Action,
): ?string {
  if (action.type === setPrimaryIdentityPublicKey) {
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

export { setPrimaryIdentityPublicKey, reducePrimaryIdentityPublicKey };
