// @flow

import invariant from 'invariant';
import {
  getStoredState,
  purgeStoredState,
  createTransform,
} from 'redux-persist';
import storage from 'redux-persist/es/storage/index.js';
import type { Transform } from 'redux-persist/es/types.js';
import type { PersistConfig } from 'redux-persist/src/types.js';

import {
  createAsyncMigrate,
  type StorageMigrationFunction,
} from 'lib/shared/create-async-migrate.js';
import type {
  KeyserverInfo,
  KeyserverStore,
} from 'lib/types/keyserver-types.js';
import {
  defaultConnectionInfo,
  type ConnectionInfo,
} from 'lib/types/socket-types.js';
import { isDev } from 'lib/utils/dev-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertDraftStoreToNewIDSchema,
} from 'lib/utils/migration-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
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
  [3]: async (state: AppState) => {
    let newState = state;
    if (state.draftStore) {
      newState = {
        ...newState,
        draftStore: convertDraftStoreToNewIDSchema(state.draftStore),
      };
    }

    if (!isDatabaseSupported) {
      return newState;
    }

    const stores = await databaseModule.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });
    invariant(stores?.store, 'Stores should exist');
    await databaseModule.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: {
        draftStoreOperations: generateIDSchemaMigrationOpsForDrafts(
          stores.store.drafts,
        ),
      },
    });

    return newState;
  },
};

const persistWhitelist = [
  'enabledApps',
  'deviceID',
  'cryptoStore',
  'notifPermissionAlertInfo',
  'commServicesAccessToken',
  'lastCommunicatedPlatformDetails',
  'keyserverStore',
];

const rootKey = 'root';

const migrateStorageToSQLite: StorageMigrationFunction = async debug => {
  const isSupported = await databaseModule.isDatabaseSupported();
  if (!isSupported) {
    return undefined;
  }

  const oldStorage = await getStoredState({ storage, key: rootKey });
  if (!oldStorage) {
    return undefined;
  }

  purgeStoredState({ storage, key: rootKey });
  if (debug) {
    console.log('redux-persist: migrating state to SQLite storage');
  }

  return oldStorage;
};

type PersistedKeyserverInfo = $Diff<
  KeyserverInfo,
  {
    +connection: ConnectionInfo,
    +updatesCurrentAsOf: number,
    +sessionID?: ?string,
  },
>;
type PersistedKeyserverStore = {
  +keyserverInfos: { +[key: string]: PersistedKeyserverInfo },
};
const keyserverStoreTransform: Transform = createTransform(
  (state: KeyserverStore): PersistedKeyserverStore => {
    const keyserverInfos = {};
    for (const key in state.keyserverInfos) {
      const { connection, updatesCurrentAsOf, sessionID, ...rest } =
        state.keyserverInfos[key];
      keyserverInfos[key] = rest;
    }
    return {
      ...state,
      keyserverInfos,
    };
  },
  (state: PersistedKeyserverStore): KeyserverStore => {
    const keyserverInfos = {};
    const defaultConnection = defaultConnectionInfo;
    for (const key in state.keyserverInfos) {
      keyserverInfos[key] = {
        ...state.keyserverInfos[key],
        connection: { ...defaultConnection },
        updatesCurrentAsOf:
          preloadedState.keyserverStore.keyserverInfos[key].updatesCurrentAsOf,
        sessionID: preloadedState.keyserverStore.keyserverInfos[key].sessionID,
      };
    }
    return {
      ...state,
      keyserverInfos,
    };
  },
  { whitelist: ['keyserverStore'] },
);

const persistConfig: PersistConfig = {
  key: rootKey,
  storage: commReduxStorageEngine,
  whitelist: isDatabaseSupported
    ? persistWhitelist
    : [...persistWhitelist, 'draftStore'],
  migrate: (createAsyncMigrate(
    migrations,
    { debug: isDev },
    migrateStorageToSQLite,
  ): any),
  version: 3,
  transforms: [keyserverStoreTransform],
};

export { persistConfig };
