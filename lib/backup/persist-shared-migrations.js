// @flow

import type { DatabaseIdentifier } from '../types/database-identifier-types.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { getConfig } from '../utils/config.js';

export type SharedMigrationFunction = (
  databaseIdentifier: DatabaseIdentifier,
) => Promise<StoreOperations>;

export type SharedMigrationsManifest = {
  +[number | string]: SharedMigrationFunction,
};
const sharedMigrations: SharedMigrationsManifest = {
  [93]: (async (databaseIdentifier: DatabaseIdentifier) => {
    const { sqliteAPI } = getConfig();

    const clientStoreToMigrate =
      await sqliteAPI.getClientDBStore(databaseIdentifier);

    if (!clientStoreToMigrate?.threadStore?.threadInfos) {
      return {};
    }

    const threadInfos: Array<RawThreadInfo> = Object.values(
      clientStoreToMigrate.threadStore.threadInfos,
    );

    const threadStoreOperations = threadInfos
      .map(rawThreadInfo => ({
        ...rawThreadInfo,
        color: 'FFFFFF',
        description: 'BACKUP_MIGRATION',
      }))
      .map(thread => ({
        type: 'replace',
        payload: {
          id: thread.id,
          threadInfo: thread,
        },
      }));

    return { threadStoreOperations };
  }: SharedMigrationFunction),
};

export { sharedMigrations };
