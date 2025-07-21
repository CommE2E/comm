// @flow

import {
  type AddLogCallback,
  logTypes,
} from '../components/debug-logs-context.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';

export type StoreAndDatabaseVersions = {
  +mainDatabaseVersion: number,
  +restoredDatabaseVersion: number,
  +mainStoreVersion: number,
  +restoredStoreVersion: number,
};

async function getStoreAndDatabaseVersions(
  addLog: AddLogCallback,
): Promise<StoreAndDatabaseVersions> {
  const { sqliteAPI } = getConfig();

  const [
    mainDatabaseVersion,
    restoredDatabaseVersion,
    restoredStoreVersionString,
  ] = await Promise.all([
    sqliteAPI.getDatabaseVersion(databaseIdentifier.MAIN),
    sqliteAPI.getDatabaseVersion(databaseIdentifier.RESTORED),
    sqliteAPI.getSyncedMetadata(
      syncedMetadataNames.STORE_VERSION,
      databaseIdentifier.RESTORED,
    ),
  ]);

  const mainStoreVersion = getConfig().platformDetails.stateVersion;

  if (!mainStoreVersion || !restoredStoreVersionString) {
    addLog(
      'User Data Restore',
      `Error when restoring user data, main store version(${
        mainStoreVersion ?? 'undefined'
      }) or restored store version (${
        restoredStoreVersionString ?? 'undefined'
      }) are undefined`,
      new Set([logTypes.BACKUP, logTypes.ERROR]),
    );
    throw new Error('version_check_failed');
  }

  const restoredStoreVersion = parseInt(restoredStoreVersionString);

  return {
    mainDatabaseVersion,
    restoredDatabaseVersion,
    mainStoreVersion,
    restoredStoreVersion,
  };
}

export { getStoreAndDatabaseVersions };
