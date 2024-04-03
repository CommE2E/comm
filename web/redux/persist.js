// @flow

import invariant from 'invariant';
import { getStoredState, purgeStoredState } from 'redux-persist';
import storage from 'redux-persist/es/storage/index.js';
import type { PersistConfig } from 'redux-persist/src/types.js';

import {
  type ClientDBKeyserverStoreOperation,
  keyserverStoreOpsHandlers,
  type ReplaceKeyserverOperation,
} from 'lib/ops/keyserver-store-ops.js';
import {
  createAsyncMigrate,
  type StorageMigrationFunction,
} from 'lib/shared/create-async-migrate.js';
import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import { messageStoreMessagesBlocklistTransform } from 'lib/shared/transforms/message-store-transform.js';
import { defaultCalendarQuery } from 'lib/types/entry-types.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { cookieTypes } from 'lib/types/session-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import { getConfig } from 'lib/utils/config.js';
import { parseCookies } from 'lib/utils/cookie-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { wipeKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertDraftStoreToNewIDSchema,
} from 'lib/utils/migration-utils.js';
import { entries } from 'lib/utils/objects.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
import { defaultWebState } from './default-state.js';
import { rootKey, rootKeyPrefix } from './persist-constants.js';
import type { AppState } from './redux-setup.js';
import { nonUserSpecificFieldsWeb } from './redux-setup.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { getOlmWasmPath } from '../shared-worker/utils/constants.js';
import { isSQLiteSupported } from '../shared-worker/utils/db-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

declare var keyserverURL: string;

const persistWhitelist = [
  'enabledApps',
  'notifPermissionAlertInfo',
  'commServicesAccessToken',
  'keyserverStore',
  'globalThemeInfo',
  'customServer',
  'messageStore',
  'nextLocalID',
];

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
    keyserverStore: wipeKeyserverStore(stateAfterReset.keyserverStore),
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

    const sharedWorker = await getCommSharedWorker();
    const isSupported = await sharedWorker.isSupported();

    if (!isSupported) {
      return newState;
    }

    const stores = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });
    invariant(stores?.store, 'Stores should exist');
    await sharedWorker.schedule({
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
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
            lastCommunicatedPlatformDetails,
          },
        },
      },
    };
  },
  [5]: async (state: any) => {
    const sharedWorker = await getCommSharedWorker();
    const isSupported = await sharedWorker.isSupported();
    if (!isSupported) {
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

    await sharedWorker.schedule({
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
          [authoritativeKeyserverID]: {
            ...state.keyserverStore.keyserverInfos[authoritativeKeyserverID],
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
        [authoritativeKeyserverID]: {
          ...state.keyserverStore.keyserverInfos[authoritativeKeyserverID],
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
  [11]: async (state: AppState) => {
    const sharedWorker = await getCommSharedWorker();
    const isSupported = await sharedWorker.isSupported();
    if (!isSupported) {
      return state;
    }

    const replaceOps: $ReadOnlyArray<ReplaceKeyserverOperation> = entries(
      state.keyserverStore.keyserverInfos,
    ).map(([id, keyserverInfo]) => ({
      type: 'replace_keyserver',
      payload: {
        id,
        keyserverInfo,
      },
    }));

    const keyserverStoreOperations: $ReadOnlyArray<ClientDBKeyserverStoreOperation> =
      keyserverStoreOpsHandlers.convertOpsToClientDBOps([
        { type: 'remove_all_keyservers' },
        ...replaceOps,
      ]);

    try {
      await sharedWorker.schedule({
        type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
        storeOperations: { keyserverStoreOperations },
      });
      return state;
    } catch (e) {
      console.log(e);
      return handleReduxMigrationFailure(state);
    }
  },
  [12]: async (state: AppState) => {
    const sharedWorker = await getCommSharedWorker();
    const isSupported = await sharedWorker.isSupported();
    if (!isSupported) {
      return state;
    }
    const replaceOps: $ReadOnlyArray<ReplaceKeyserverOperation> = entries(
      state.keyserverStore.keyserverInfos,
    )
      .filter(([, keyserverInfo]) => !keyserverInfo.actualizedCalendarQuery)
      .map(([id, keyserverInfo]) => ({
        type: 'replace_keyserver',
        payload: {
          id,
          keyserverInfo: {
            ...keyserverInfo,
            actualizedCalendarQuery: defaultCalendarQuery(
              getConfig().platformDetails.platform,
            ),
          },
        },
      }));
    if (replaceOps.length === 0) {
      return state;
    }

    const newState = {
      ...state,
      keyserverStore: keyserverStoreOpsHandlers.processStoreOperations(
        state.keyserverStore,
        replaceOps,
      ),
    };
    const keyserverStoreOperations =
      keyserverStoreOpsHandlers.convertOpsToClientDBOps(replaceOps);

    try {
      await sharedWorker.schedule({
        type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
        storeOperations: { keyserverStoreOperations },
      });
      return newState;
    } catch (e) {
      console.log(e);
      return handleReduxMigrationFailure(newState);
    }
  },
  [13]: async (state: any) => {
    const { cryptoStore, ...rest } = state;
    const sharedWorker = await getCommSharedWorker();
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT,
      olmWasmPath: getOlmWasmPath(),
      initialCryptoStore: cryptoStore,
    });
    return rest;
  },
};

const migrateStorageToSQLite: StorageMigrationFunction = async debug => {
  const sharedWorker = await getCommSharedWorker();
  const isSupported = await sharedWorker.isSupported();
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
  keyPrefix: rootKeyPrefix,
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
  version: 13,
  transforms: [messageStoreMessagesBlocklistTransform, keyserverStoreTransform],
};

export { persistConfig };
