// @flow

import { DEFAULT_VERSION } from 'redux-persist/es/constants.js';
import type { PersistState } from 'redux-persist/es/types.js';

import type { StoreOperations } from '../types/store-ops-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';

type LegacyMigrationManifest = {
  +[number | string]: (PersistedState) => Promise<PersistedState>,
};
type PersistedState = {
  +_persist: PersistState,
  ...
} | void;
type ConfigType = {
  +debug: boolean,
};

export type StorageMigrationFunction = (
  debug: boolean,
) => Promise<?PersistedState>;

type MigrationManifest = {
  +[number | string]: (PersistedState) => Promise<{
    +state: PersistedState,
    +ops: StoreOperations,
  }>,
};

function createAsyncMigrate(
  legacyMigrations: LegacyMigrationManifest,
  config: ConfigType,
  migrations: MigrationManifest,
  storageMigration: ?StorageMigrationFunction,
): (state: PersistedState, currentVersion: number) => Promise<PersistedState> {
  const debug = process.env.NODE_ENV !== 'production' && !!config?.debug;
  return async function (
    state: ?PersistedState,
    currentVersion: number,
  ): Promise<PersistedState> {
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

    let migratedState: PersistedState = state;
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
            data: `${versionKey}`,
          },
        };
        const dbOps = {
          ...ops,
          syncedMetadataStoreOperations: [
            ...(ops.syncedMetadataStoreOperations ?? []),
            versionUpdateOp,
          ],
        };
        await getConfig().sqliteAPI.processDBStoreOperations(dbOps);
      }
    }

    return migratedState;
  };
}

export { createAsyncMigrate };
