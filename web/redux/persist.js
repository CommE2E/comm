// @flow

import { getStoredState, purgeStoredState } from 'redux-persist';
import storage from 'redux-persist/es/storage/index.js';
import type { PersistConfig } from 'redux-persist/src/types.js';

import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import { messageStoreMessagesBlocklistTransform } from 'lib/shared/transforms/message-store-transform.js';
import { isDev } from 'lib/utils/dev-utils.js';
import {
  createAsyncMigrate,
  type StorageMigrationFunction,
} from 'lib/utils/migration-utils.js';

import commReduxStorageEngine from './comm-redux-storage-engine.js';
import { persistWhitelist } from './handle-redux-migration-failure.js';
import { migrations, legacyMigrations } from './migrations.js';
import { rootKey, rootKeyPrefix, storeVersion } from './persist-constants.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { isSQLiteSupported } from '../shared-worker/utils/db-utils.js';

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
    legacyMigrations,
    { debug: isDev },
    migrations,
    migrateStorageToSQLite,
  ): any),
  version: storeVersion,
  transforms: [messageStoreMessagesBlocklistTransform, keyserverStoreTransform],
};

export { persistConfig };
