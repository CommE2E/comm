// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import type { CryptoStore } from 'lib/types/crypto-types.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import type { Action } from './redux-setup.js';

const setPrimaryIdentityKeys = 'SET_PRIMARY_IDENTITY_KEYS';
const setNotificationIdentityKeys = 'SET_NOTIFICATION_IDENTITY_KEYS';

function reduceCryptoStore(state: CryptoStore, action: Action): CryptoStore {
  if (action.type === setPrimaryIdentityKeys) {
    return {
      ...state,
      primaryIdentityKeys: action.payload,
    };
  } else if (action.type === setNotificationIdentityKeys) {
    return {
      ...state,
      notificationIdentityKeys: action.payload,
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {
      primaryAccount: null,
      primaryIdentityKeys: null,
      notificationAccount: null,
      notificationIdentityKeys: null,
    };
  }
  return state;
}

export {
  setPrimaryIdentityKeys,
  setNotificationIdentityKeys,
  reduceCryptoStore,
};
