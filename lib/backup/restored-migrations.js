// @flow

import { sharedMigrations } from './persist-shared-migrations.js';
import { createReplaceSyncedMetadataOperation } from '../ops/synced-metadata-store-ops.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';
import { BackupIsNewerError, getMessageForException } from '../utils/errors.js';

async function getRestoredStoreVersion(): Promise<number> {
  const { sqliteAPI } = getConfig();
  const storeVersion = await sqliteAPI.getSyncedMetadata(
    syncedMetadataNames.STORE_VERSION,
    databaseIdentifier.RESTORED,
  );
  if (!storeVersion) {
    throw new Error('storeVersion is missing');
  }
  return parseInt(storeVersion, 10);
}

async function runRestoredBackupMigrations(restoredDatabaseVersion: number) {
  const currentStoreVersion = getConfig().platformDetails.stateVersion;
  if (!currentStoreVersion) {
    throw new Error('currentStoreVersion is missing');
  }

  const restoredStoreVersion = await getRestoredStoreVersion();
  if (restoredStoreVersion === currentStoreVersion) {
    console.log('backup-restore: versions match, noop migration');
    return;
  }

  if (restoredStoreVersion > currentStoreVersion) {
    console.log('backup-restore: current app is older than backup');
    throw new BackupIsNewerError(
      'backup_is_newer',
      restoredDatabaseVersion,
      restoredStoreVersion,
    );
  }

  console.log(
    `backup-restore: migrating from ${restoredStoreVersion} to ${currentStoreVersion}`,
  );

  const migrationKeys = Object.keys(sharedMigrations)
    .map(ver => parseInt(ver))
    .filter(key => currentStoreVersion >= key && key > restoredStoreVersion)
    .sort((a, b) => a - b);

  for (const versionKey of migrationKeys) {
    console.log('backup-restore: running migration for versionKey', versionKey);

    if (!versionKey) {
      continue;
    }
    try {
      const ops = await sharedMigrations[versionKey](
        databaseIdentifier.RESTORED,
      );
      const versionUpdateOp = createReplaceSyncedMetadataOperation(
        syncedMetadataNames.STORE_VERSION,
        versionKey.toString(),
      );
      const dbOps = {
        ...ops,
        syncedMetadataStoreOperations: [
          ...(ops.syncedMetadataStoreOperations ?? []),
          versionUpdateOp,
        ],
      };
      await getConfig().sqliteAPI.processDBStoreOperations(
        dbOps,
        databaseIdentifier.RESTORED,
      );
    } catch (exception) {
      throw new Error(
        `Error while running migration: ${versionKey}: ${
          getMessageForException(exception) ?? 'unknown error'
        }`,
      );
    }
  }
}

export { runRestoredBackupMigrations };
