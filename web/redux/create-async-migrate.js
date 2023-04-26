// @flow

import { getStoredState, purgeStoredState } from 'redux-persist';
import { DEFAULT_VERSION } from 'redux-persist/es/constants.js';
import storage from 'redux-persist/es/storage/index.js';
import type { PersistState } from 'redux-persist/es/types.js';

import { databaseModule } from '../database/database-module-provider.js';

type MigrationManifest = {
  +[number | string]: (PersistedState) => Promise<PersistedState>,
};
type PersistedState = {
  +_persist: PersistState,
  ...
} | void;
type ConfigType = {
  +debug: boolean,
};

function createAsyncMigrate(
  migrations: MigrationManifest,
  config: ConfigType,
): (state: PersistedState, currentVersion: number) => Promise<PersistedState> {
  const debug = process.env.NODE_ENV !== 'production' && !!config?.debug;
  return async function (
    state: PersistedState,
    currentVersion: number,
  ): Promise<PersistedState> {
    if (!state) {
      const isSupported = await databaseModule.isDatabaseSupported();
      if (!isSupported) {
        if (debug) {
          console.log('redux-persist: no inbound state, skipping migration');
        }
        return undefined;
      }

      const oldStorage = await getStoredState({ storage, key: 'root' });
      if (!oldStorage) {
        return undefined;
      }

      state = oldStorage;
      purgeStoredState({ storage, key: 'root' });
      if (debug) {
        console.log('redux-persist: migrating state to SQLite storage');
      }
    }

    const inboundVersion: number = state?._persist?.version ?? DEFAULT_VERSION;

    if (inboundVersion === currentVersion) {
      if (debug) {
        console.log('redux-persist: versions match, noop migration');
      }
      return state;
    }
    if (inboundVersion > currentVersion) {
      if (debug) {
        console.error('redux-persist: downgrading version is not supported');
      }
      return state;
    }

    const newMigrationKeys = Object.keys(migrations)
      .map(ver => parseInt(ver))
      .filter(key => currentVersion >= key && key > inboundVersion);
    const sortedMigrationKeys = newMigrationKeys.sort((a, b) => a - b);

    if (debug) {
      console.log('redux-persist: migrationKeys', sortedMigrationKeys);
    }

    let migratedState: PersistedState = state;
    for (const versionKey of sortedMigrationKeys) {
      if (debug) {
        console.log(
          'redux-persist: running migration for versionKey',
          versionKey,
        );
      }
      if (versionKey) {
        migratedState = await migrations[versionKey](migratedState);
      }
    }

    return migratedState;
  };
}

export { createAsyncMigrate };
