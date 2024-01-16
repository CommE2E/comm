// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import type { CryptoStore } from 'lib/types/crypto-types.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import type { Action } from './redux-setup.js';

const setCryptoStore = 'SET_CRYPTO_STORE';

function reduceCryptoStore(state: ?CryptoStore, action: Action): ?CryptoStore {
  if (action.type === setCryptoStore) {
    return action.payload;
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return null;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    !usingCommServicesAccessToken
  ) {
    return null;
  }
  return state;
}

export { setCryptoStore, reduceCryptoStore };
