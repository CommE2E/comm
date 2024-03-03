// @flow

import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import type { CryptoStore } from 'lib/types/crypto-types.js';
import { relyingOnAuthoritativeKeyserver } from 'lib/utils/services-utils.js';

import type { Action } from './redux-setup.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';

const setCryptoStore = 'SET_CRYPTO_STORE';

function reduceCryptoStore(state: ?CryptoStore, action: Action): ?CryptoStore {
  if (action.type === setCryptoStore) {
    return action.payload;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID &&
    relyingOnAuthoritativeKeyserver
  ) {
    return null;
  }
  return state;
}

export { setCryptoStore, reduceCryptoStore };
