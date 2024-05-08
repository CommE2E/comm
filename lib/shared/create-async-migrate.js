// @flow

import { DEFAULT_VERSION } from 'redux-persist/es/constants.js';

import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';

type LegacyMigrationManifest<N: BaseNavInfo, T: BaseAppState<N>> = {
  +[number | string]: (T) => Promise<T>,
};
type PersistedState<N: BaseNavInfo, T: BaseAppState<N>> = T | void;
type ConfigType = {
  +debug: boolean,
};

export type StorageMigrationFunction<N: BaseNavInfo, T: BaseAppState<N>> = (
  debug: boolean,
) => Promise<?PersistedState<N, T>>;

type MigrationManifest<N: BaseNavInfo, T: BaseAppState<N>> = {
  +[number | string]: (PersistedState<N, T>) => Promise<{
    +state: T,
    +ops: StoreOperations,
  }>,
};

function createAsyncMigrate<N: BaseNavInfo, T: BaseAppState<N>>(
  legacyMigrations: LegacyMigrationManifest<N, T>,
  config: ConfigType,
  migrations: MigrationManifest<N, T>,
  handleException: (error: Error, state: T) => T,
  storageMigration: ?StorageMigrationFunction<N, T>,
): (
  state: PersistedState<N, T>,
  currentVersion: number,
) => Promise<?PersistedState<N, T>> {
  const debug = process.env.NODE_ENV !== 'production' && !!config?.debug;
  return async function (
    state: ?PersistedState<N, T>,
    currentVersion: number,
  ): Promise<?PersistedState<N, T>> {
    if (!state && storageMigration) {
      state = await storageMigration(debug);
    }
    if (!state) {
      if (debug) {
        console.log('redux-persist: no inbound state, skipping migration');
      }
      return undefined;
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

    const migrationKeys = [
      ...Object.keys(legacyMigrations),
      ...Object.keys(migrations),
    ]
      .map(ver => parseInt(ver))
      .filter(key => currentVersion >= key && key > inboundVersion);
    const sortedMigrationKeys = migrationKeys.sort((a, b) => a - b);

    if (debug) {
      console.log('redux-persist: migrationKeys', sortedMigrationKeys);
    }

    let migratedState = state;
    for (const versionKey of sortedMigrationKeys) {
      if (debug) {
        console.log(
          'redux-persist: running migration for versionKey',
          versionKey,
        );
      }

      if (!versionKey) {
        continue;
      }

      if (legacyMigrations[versionKey]) {
        migratedState = await legacyMigrations[versionKey](migratedState);
      } else {
        const { state: newState, ops } =
          await migrations[versionKey](migratedState);
        migratedState = newState;
        const versionUpdateOp = {
          type: 'replace_synced_metadata_entry',
          payload: {
            name: syncedMetadataNames.DB_VERSION,
            data: versionKey.toString(),
          },
        };
        const dbOps = {
          ...ops,
          syncedMetadataStoreOperations: [
            ...(ops.syncedMetadataStoreOperations ?? []),
            versionUpdateOp,
          ],
        };
        try {
          await getConfig().sqliteAPI.processDBStoreOperations(dbOps);
        } catch (exception) {
          return handleException(exception, state);
        }
      }
    }

    return migratedState;
  };
}

export { createAsyncMigrate };
