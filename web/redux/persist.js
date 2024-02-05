// @flow

import invariant from 'invariant';
import { getStoredState, purgeStoredState } from 'redux-persist';
import storage from 'redux-persist/es/storage/index.js';
import type { PersistConfig } from 'redux-persist/src/types.js';

import {
  createAsyncMigrate,
  type StorageMigrationFunction,
} from 'lib/shared/create-async-migrate.js';
import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { cookieTypes } from 'lib/types/session-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import { parseCookies } from 'lib/utils/cookie-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { removeCookiesFromKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertDraftStoreToNewIDSchema,
} from 'lib/utils/migration-utils.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
import { defaultWebState } from './default-state.js';
import type { AppState } from './redux-setup.js';
import { nonUserSpecificFieldsWeb } from './redux-setup.js';
import { getDatabaseModule } from '../database/database-module-provider.js';
import { isSQLiteSupported } from '../database/utils/db-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

declare var keyserverURL: string;

const persistWhitelist = [
  'enabledApps',
  'cryptoStore',
  'notifPermissionAlertInfo',
  'commServicesAccessToken',
  'keyserverStore',
  'globalThemeInfo',
  'customServer',
];

// eslint-disable-next-line no-unused-vars
function handleReduxMigrationFailure(oldState: AppState): AppState {
  const persistedNonUserSpecificFields = nonUserSpecificFieldsWeb.filter(
    field => persistWhitelist.includes(field) || field === '_persist',
  );
  const stateAfterReset = resetUserSpecificState(
    oldState,
    defaultWebState,
    persistedNonUserSpecificFields,
  );
  return {
    ...stateAfterReset,
    keyserverStore: removeCookiesFromKeyserverStore(
      stateAfterReset.keyserverStore,
    ),
  };
}

const migrations = {
  [1]: async (state: any) => {
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
  [2]: async (state: AppState) => {
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

    const databaseModule = await getDatabaseModule();
    const isDatabaseSupported = await databaseModule.isDatabaseSupported();

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
  [4]: async (state: any) => {
    const { lastCommunicatedPlatformDetails, keyserverStore, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [ashoatKeyserverID]: {
            ...keyserverStore.keyserverInfos[ashoatKeyserverID],
            lastCommunicatedPlatformDetails,
          },
        },
      },
    };
  },
  [5]: async (state: any) => {
    const databaseModule = await getDatabaseModule();
    const isDatabaseSupported = await databaseModule.isDatabaseSupported();
    if (!isDatabaseSupported) {
      return state;
    }

    if (!state.draftStore) {
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
  [6]: async (state: AppState) => ({
    ...state,
    integrityStore: { threadHashes: {}, threadHashingStatus: 'starting' },
  }),
  [7]: async (state: AppState): Promise<AppState> => {
    if (!document.cookie) {
      return state;
    }

    const params = parseCookies(document.cookie);
    let cookie = null;
    if (params[cookieTypes.USER]) {
      cookie = `${cookieTypes.USER}=${params[cookieTypes.USER]}`;
    } else if (params[cookieTypes.ANONYMOUS]) {
      cookie = `${cookieTypes.ANONYMOUS}=${params[cookieTypes.ANONYMOUS]}`;
    }

    return {
      ...state,
      keyserverStore: {
        ...state.keyserverStore,
        keyserverInfos: {
          ...state.keyserverStore.keyserverInfos,
          [ashoatKeyserverID]: {
            ...state.keyserverStore.keyserverInfos[ashoatKeyserverID],
            cookie,
          },
        },
      },
    };
  },
  [8]: async (state: AppState) => ({
    ...state,
    globalThemeInfo: defaultGlobalThemeInfo,
  }),
  [9]: async (state: AppState) => ({
    ...state,
    keyserverStore: {
      ...state.keyserverStore,
      keyserverInfos: {
        ...state.keyserverStore.keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverStore.keyserverInfos[ashoatKeyserverID],
          urlPrefix: keyserverURL,
        },
      },
    },
  }),
  [10]: async (state: AppState) => {
    const { keyserverInfos } = state.keyserverStore;
    const newKeyserverInfos: { [string]: KeyserverInfo } = {};
    for (const key in keyserverInfos) {
      newKeyserverInfos[key] = {
        ...keyserverInfos[key],
        connection: { ...defaultConnectionInfo },
        updatesCurrentAsOf: 0,
        sessionID: null,
      };
    }
    return {
      ...state,
      keyserverStore: {
        ...state.keyserverStore,
        keyserverInfos: newKeyserverInfos,
      },
    };
  },
};

const rootKey = 'root';

const migrateStorageToSQLite: StorageMigrationFunction = async debug => {
  const databaseModule = await getDatabaseModule();
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

  const allKeys = Object.keys(oldStorage);
  const transforms = persistConfig.transforms ?? [];
  const newStorage = { ...oldStorage };

  for (const transform of transforms) {
    for (const key of allKeys) {
      const transformedStore = transform.out(newStorage[key], key, newStorage);
      newStorage[key] = transformedStore;
    }
  }

  return newStorage;
};

const persistConfig: PersistConfig = {
  key: rootKey,
  storage: commReduxStorageEngine,
  whitelist: isSQLiteSupported()
    ? persistWhitelist
    : [...persistWhitelist, 'draftStore'],
  migrate: (createAsyncMigrate(
    migrations,
    { debug: isDev },
    migrateStorageToSQLite,
  ): any),
  version: 10,
  transforms: [keyserverStoreTransform],
};

export { persistConfig };
