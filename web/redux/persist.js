// @flow

import invariant from 'invariant';
import _keyBy from 'lodash/fp/keyBy.js';
import { getStoredState, purgeStoredState } from 'redux-persist';
import storage from 'redux-persist/es/storage/index.js';
import type { PersistConfig } from 'redux-persist/src/types.js';

import {
  type ClientDBKeyserverStoreOperation,
  keyserverStoreOpsHandlers,
  type ReplaceKeyserverOperation,
} from 'lib/ops/keyserver-store-ops.js';
import {
  messageStoreOpsHandlers,
  type ReplaceMessageStoreLocalMessageInfoOperation,
  type ClientDBMessageStoreOperation,
  type MessageStoreOperation,
} from 'lib/ops/message-store-ops.js';
import type {
  ClientDBThreadStoreOperation,
  ThreadStoreOperation,
} from 'lib/ops/thread-store-ops.js';
import { patchRawThreadInfoWithSpecialRole } from 'lib/permissions/special-roles.js';
import { createUpdateDBOpsForThreadStoreThreadInfos } from 'lib/shared/redux/client-db-utils.js';
import { deprecatedUpdateRolesAndPermissions } from 'lib/shared/redux/deprecated-update-roles-and-permissions.js';
import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import { messageStoreMessagesBlocklistTransform } from 'lib/shared/transforms/message-store-transform.js';
import { defaultAlertInfos } from 'lib/types/alert-types.js';
import { defaultCalendarQuery } from 'lib/types/entry-types.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type { WebNavInfo } from 'lib/types/nav-types.js';
import { cookieTypes } from 'lib/types/session-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import type {
  ClientDBThreadInfo,
  RawThreadInfos,
} from 'lib/types/thread-types.js';
import { getConfig } from 'lib/utils/config.js';
import { parseCookies } from 'lib/utils/cookie-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { stripMemberPermissionsFromRawThreadInfos } from 'lib/utils/member-info-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertDraftStoreToNewIDSchema,
  createAsyncMigrate,
  type StorageMigrationFunction,
  type MigrationFunction,
  type MigrationsManifest,
} from 'lib/utils/migration-utils.js';
import { entries, values } from 'lib/utils/objects.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from 'lib/utils/thread-ops-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
import {
  handleReduxMigrationFailure,
  persistWhitelist,
} from './handle-redux-migration-failure.js';
import { rootKey, rootKeyPrefix, storeVersion } from './persist-constants.js';
import type { AppState } from './redux-setup.js';
import { legacyUnshimClientDB } from './unshim-utils.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { getOlmWasmPath } from '../shared-worker/utils/constants.js';
import { isSQLiteSupported } from '../shared-worker/utils/db-utils.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

declare var keyserverURL: string;

const legacyMigrations = {
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
  [14]: async (state: AppState) => {
    const sharedWorker = await getCommSharedWorker();
    const isSupported = await sharedWorker.isSupported();

    if (!isSupported) {
      return state;
    }

    const stores = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });
    const keyserversDBInfo = stores?.store?.keyservers;
    if (!keyserversDBInfo) {
      return state;
    }

    const { translateClientDBData } = keyserverStoreOpsHandlers;
    const keyservers = translateClientDBData(keyserversDBInfo);

    // There is no modification of the keyserver data, but the ops handling
    // should correctly split the data between synced and non-synced tables

    const replaceOps: $ReadOnlyArray<ReplaceKeyserverOperation> = entries(
      keyservers,
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
  [15]: (state: any) => {
    const { notifPermissionAlertInfo, ...rest } = state;
    const newState = {
      ...rest,
      alertStore: {
        alertInfos: defaultAlertInfos,
      },
    };

    return newState;
  },
  [16]: async (state: AppState) => {
    // 1. Check if `databaseModule` is supported and early-exit if not.
    const sharedWorker = await getCommSharedWorker();
    const isDatabaseSupported = await sharedWorker.isSupported();

    if (!isDatabaseSupported) {
      return state;
    }

    // 2. Get existing `stores` from SQLite.
    const stores = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });

    const messages: ?$ReadOnlyArray<ClientDBMessageInfo> =
      stores?.store?.messages;

    if (messages === null || messages === undefined || messages.length === 0) {
      return state;
    }

    // 3. Filter out `UNSUPPORTED.UPDATE_RELATIONSHIP` `ClientDBMessageInfo`s.
    const unsupportedMessageIDsToRemove = messages
      .filter((message: ClientDBMessageInfo) => {
        if (parseInt(message.type) !== messageTypes.UPDATE_RELATIONSHIP) {
          return false;
        }
        if (message.content === null || message.content === undefined) {
          return false;
        }
        const { operation } = JSON.parse(message.content);
        return operation === 'farcaster_mutual';
      })
      .map(message => message.id);

    // 4. Construct `ClientDBMessageStoreOperation`s
    const messageStoreOperations: $ReadOnlyArray<ClientDBMessageStoreOperation> =
      [
        {
          type: 'remove',
          payload: { ids: unsupportedMessageIDsToRemove },
        },
      ];

    // 5. Process the constructed `messageStoreOperations`.
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: { messageStoreOperations },
    });

    return state;
  },
  [17]: async (state: AppState) => {
    // 1. Check if `databaseModule` is supported and early-exit if not.
    const sharedWorker = await getCommSharedWorker();
    const isDatabaseSupported = await sharedWorker.isSupported();

    if (!isDatabaseSupported) {
      return state;
    }

    // 2. Get existing `stores` from SQLite.
    const stores = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });

    const threads: ?$ReadOnlyArray<ClientDBThreadInfo> = stores?.store?.threads;

    if (threads === null || threads === undefined || threads.length === 0) {
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
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
      storeOperations: { threadStoreOperations },
    });

    return state;
  },
  [18]: (state: AppState) =>
    legacyUnshimClientDB(state, [messageTypes.UPDATE_RELATIONSHIP]),
};

const migrateStorageToSQLite: StorageMigrationFunction<
  WebNavInfo,
  AppState,
> = async debug => {
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

const migrations: MigrationsManifest<WebNavInfo, AppState> = {
  // This migration doesn't change the store but sets a persisted version
  // in the DB
  [75]: (async (state: AppState) => ({
    state,
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [76]: (async (state: AppState) => {
    const localMessageInfos = state.messageStore.local;

    const replaceOps: $ReadOnlyArray<ReplaceMessageStoreLocalMessageInfoOperation> =
      entries(localMessageInfos).map(([id, localMessageInfo]) => ({
        type: 'replace_local_message_info',
        payload: {
          id,
          localMessageInfo,
        },
      }));

    const operations: $ReadOnlyArray<MessageStoreOperation> = [
      {
        type: 'remove_all_local_message_infos',
      },
      ...replaceOps,
    ];

    const newMessageStore = messageStoreOpsHandlers.processStoreOperations(
      state.messageStore,
      operations,
    );

    return {
      state: {
        ...state,
        messageStore: newMessageStore,
      },
      ops: {
        messageStoreOperations: operations,
      },
    };
  }: MigrationFunction<WebNavInfo, AppState>),
  [77]: (async (state: AppState) => ({
    state,
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [78]: (async (state: AppState) => {
    // 1. Check if `databaseModule` is supported and early-exit if not.
    const sharedWorker = await getCommSharedWorker();
    const isDatabaseSupported = await sharedWorker.isSupported();

    if (!isDatabaseSupported) {
      return {
        state,
        ops: {},
      };
    }

    // 2. Get existing `stores` from SQLite.
    const stores = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });

    const clientDBThreadInfos: ?$ReadOnlyArray<ClientDBThreadInfo> =
      stores?.store?.threads;

    if (
      clientDBThreadInfos === null ||
      clientDBThreadInfos === undefined ||
      clientDBThreadInfos.length === 0
    ) {
      return {
        state,
        ops: {},
      };
    }

    const operations = createUpdateDBOpsForThreadStoreThreadInfos(
      clientDBThreadInfos,
      deprecatedUpdateRolesAndPermissions,
    );

    return {
      state,
      ops: {
        threadStoreOperations: operations,
      },
    };
  }: MigrationFunction<WebNavInfo, AppState>),
  [79]: (async (state: AppState) => {
    return {
      state: {
        ...state,
        tunnelbrokerDeviceToken: {
          localToken: null,
          tunnelbrokerToken: null,
        },
      },
      ops: {},
    };
  }: MigrationFunction<WebNavInfo, AppState>),
  [81]: (async (state: any) => ({
    state: {
      ...state,
      queuedDMOperations: {
        operations: {},
      },
    },
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [82]: (async (state: any) => ({
    state: {
      ...state,
      queuedDMOperations: {
        threadQueue: state.queuedDMOperations.operations,
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {},
      },
    },
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [83]: (async (state: AppState) => ({
    state: {
      ...state,
      holderStore: {
        storedHolders: {},
      },
    },
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [84]: (async (state: AppState) => {
    const sharedWorker = await getCommSharedWorker();
    const isDatabaseSupported = await sharedWorker.isSupported();

    if (!isDatabaseSupported) {
      return {
        state,
        ops: {},
      };
    }

    const stores = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_CLIENT_STORE,
    });

    const clientDBThreadInfos: ?$ReadOnlyArray<ClientDBThreadInfo> =
      stores?.store?.threads;

    if (
      clientDBThreadInfos === null ||
      clientDBThreadInfos === undefined ||
      clientDBThreadInfos.length === 0
    ) {
      return {
        state,
        ops: {},
      };
    }

    // 1. Translate `ClientDBThreadInfo`s to `RawThreadInfo`s.
    const rawThreadInfos = clientDBThreadInfos.map(
      convertClientDBThreadInfoToRawThreadInfo,
    );

    // 2. Convert `RawThreadInfo`s to a map of `threadID` => `threadInfo`.
    const keyedRawThreadInfos = _keyBy('id')(rawThreadInfos);

    // This isn't actually accurate, but we force this cast here because the
    // types for createUpdateDBOpsForThreadStoreThreadInfos assume they're
    // converting from a client DB that contains RawThreadInfos. In fact, at
    // this point the client DB contains ThinRawThreadInfoWithPermissions.
    const stripMemberPermissions: RawThreadInfos => RawThreadInfos =
      (stripMemberPermissionsFromRawThreadInfos: any);

    // 3. Apply `stripMemberPermissions` to `ThreadInfo`s.
    const updatedKeyedRawThreadInfos =
      stripMemberPermissions(keyedRawThreadInfos);

    // 4. Convert the updated `RawThreadInfos` back into an array.
    const updatedKeyedRawThreadInfosArray = values(updatedKeyedRawThreadInfos);

    // 5. Construct `ThreadStoreOperation`s.
    const threadOperations: ThreadStoreOperation[] = [{ type: 'remove_all' }];
    for (const rawThreadInfo of updatedKeyedRawThreadInfosArray) {
      threadOperations.push({
        type: 'replace',
        payload: { id: rawThreadInfo.id, threadInfo: rawThreadInfo },
      });
    }

    const operations: StoreOperations = {
      threadStoreOperations: threadOperations,
    };
    return { state, ops: operations };
  }: MigrationFunction<WebNavInfo, AppState>),
  [85]: (async (state: AppState) => ({
    state,
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [86]: (async (state: AppState) => ({
    state: {
      ...state,
      queuedDMOperations: {
        ...state.queuedDMOperations,
        shimmedOperations: [],
      },
    },
    ops: {},
  }): MigrationFunction<WebNavInfo, AppState>),
  [87]: (async (state: AppState) => {
    const { coldStartCount, ...restOfAlertStore } = (state.alertStore: any);

    return {
      state: {
        ...state,
        alertStore: restOfAlertStore,
      },
      ops: {},
    };
  }: MigrationFunction<WebNavInfo, AppState>),
};

const persistConfig: PersistConfig = {
  keyPrefix: rootKeyPrefix,
  key: rootKey,
  storage: commReduxStorageEngine,
  whitelist: isSQLiteSupported()
    ? persistWhitelist
    : [...persistWhitelist, 'draftStore'],
  migrate: (createAsyncMigrate(
    legacyMigrations,
    { debug: isDev },
    migrations,
    (error: Error, state: AppState) => handleReduxMigrationFailure(state),
    migrateStorageToSQLite,
  ): any),
  version: storeVersion,
  transforms: [messageStoreMessagesBlocklistTransform, keyserverStoreTransform],
  timeout: ((isDev ? 0 : 30000): number | void),
};

export { persistConfig };
