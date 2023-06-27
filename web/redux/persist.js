// @flow

import type { PersistConfig } from 'redux-persist/src/types.js';

import { isDev } from 'lib/utils/dev-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
import { createAsyncMigrate } from './create-async-migrate.js';
import type { AppState } from './redux-setup.js';
import { databaseModule } from '../database/database-module-provider.js';
import { isSQLiteSupported } from '../database/utils/db-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

declare var preloadedState: AppState;

const initiallyLoggedInUserID = preloadedState.currentUserInfo?.anonymous
  ? undefined
  : preloadedState.currentUserInfo?.id;
const isDatabaseSupported = isSQLiteSupported(initiallyLoggedInUserID);

const migrations = {
  [1]: async state => {
    const {
      primaryIdentityPublicKey,
      ...stateWithoutPrimaryIdentityPublicKey
    } = state;
    return {
      ...stateWithoutPrimaryIdentityPublicKey,
      cryptoStore: {
        primaryAccount: null,
        primaryIdentityKeys: null,
        notificationAccount: null,
        notificationIdentityKeys: null,
      },
    };
  },
  [2]: async state => {
    if (!isDatabaseSupported) {
      return state;
    }

    const { drafts } = state.draftStore;
    const draftStoreOperations = [];
    for (const key in drafts) {
      const text = drafts[key];
      draftStoreOperations.push({
        type: 'update',
        payload: { key, text },
      });
    }

    await databaseModule.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: { draftStoreOperations },
    });

    return state;
  },
};

const persistWhitelist = [
  'enabledApps',
  'deviceID',
  'cryptoStore',
  'notifPermissionAlertInfo',
  'commServicesAccessToken',
  'lastCommunicatedPlatformDetails',
];

const persistConfig: PersistConfig = {
  key: 'root',
  storage: commReduxStorageEngine,
  whitelist: isDatabaseSupported
    ? persistWhitelist
    : [...persistWhitelist, 'draftStore'],
  migrate: (createAsyncMigrate(migrations, { debug: isDev }): any),
  version: 2,
};

export { persistConfig };
