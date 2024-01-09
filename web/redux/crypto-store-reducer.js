// @flow

import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import type { CryptoStore } from 'lib/types/crypto-types.js';

import type { Action } from './redux-setup.js';

const setCryptoStore = 'SET_CRYPTO_STORE';

function reduceCryptoStore(state: ?CryptoStore, action: Action): ?CryptoStore {
  if (action.type === setCryptoStore) {
    return action.payload;
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteKeyserverAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return null;
  }
  return state;
}

export { setCryptoStore, reduceCryptoStore };
