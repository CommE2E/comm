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
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import { patchRawThreadInfoWithSpecialRole } from 'lib/permissions/special-roles.js';
import {
  createAsyncMigrate,
  type StorageMigrationFunction,
} from 'lib/shared/create-async-migrate.js';
import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { cookieTypes } from 'lib/types/session-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';
import { parseCookies } from 'lib/utils/cookie-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { wipeKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertDraftStoreToNewIDSchema,
} from 'lib/utils/migration-utils.js';
import { entries } from 'lib/utils/objects.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from 'lib/utils/thread-ops-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
import { defaultWebState } from './default-state.js';
import { rootKey, rootKeyPrefix } from './persist-constants.js';
import type { AppState } from './redux-setup.js';
import { nonUserSpecificFieldsWeb } from './redux-setup.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
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
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
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
    const databaseModule = await getDatabaseModule();
    const isDatabaseSupported = await databaseModule.isDatabaseSupported();
    if (!isDatabaseSupported) {
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
      await databaseModule.schedule({
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
    // 1. Check if `databaseModule` is supported and early-exit if not.
    const databaseModule = await getDatabaseModule();
    const isDatabaseSupported = await databaseModule.isDatabaseSupported();

    if (!isDatabaseSupported) {
      return state;
    }

    // 2. Get existing `stores` from SQLite.
    const stores = await databaseModule.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });
    invariant(stores?.store, 'Stores should exist');
    const threads: $ReadOnlyArray<ClientDBThreadInfo> = stores.store.threads;

    if (threads.length === 0) {
      return state;
    }

    // 3. Convert to `RawThreadInfo`, patch in `specialRole`, and convert back.
    const patchedClientDBThreadInfos: $ReadOnlyArray<ClientDBThreadInfo> =
      threads
        .map(convertClientDBThreadInfoToRawThreadInfo)
        .map(patchRawThreadInfoWithSpecialRole)
        .map(convertRawThreadInfoToClientDBThreadInfo);

    // 4. Construct operations to remove existing threads and replace them
    //    with threads that have the `specialRole` field patched in.
    const threadStoreOperations: ClientDBThreadStoreOperation[] = [];
    threadStoreOperations.push({ type: 'remove_all' });
    for (const clientDBThreadInfo: ClientDBThreadInfo of patchedClientDBThreadInfos) {
      threadStoreOperations.push({
        type: 'replace',
        payload: clientDBThreadInfo,
      });
    }

    // 5. Process the constructed `threadStoreOperations`.
    await databaseModule.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: { threadStoreOperations },
    });

    return state;
  },
};

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
  version: 12,
  transforms: [keyserverStoreTransform],
};

export { persistConfig };
