// @flow

import * as React from 'react';

import { runRestoredBackupMigrations } from './restored-migrations.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { generateOpsToEstablishHoldersOnDevice } from '../actions/holder-actions.js';
import { logTypes, useDebugLogs } from '../components/debug-logs-context.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import type { QRAuthBackupData } from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatch } from '../utils/redux-utils.js';

function useUserDataRestore(): (
  backupData: QRAuthBackupData,
  identityAuthResult: IdentityAuthResult,
) => Promise<void> {
  const dispatch = useDispatch();
  const { addLog } = useDebugLogs();

  return React.useCallback(
    async (
      backupData: QRAuthBackupData,
      identityAuthResult: IdentityAuthResult,
    ) => {
      const { sqliteAPI } = getConfig();

      // 1. Download database and apply all logs
      await sqliteAPI.restoreUserData(backupData, identityAuthResult);

      // 2. Check database versions and migrate if needed
      const [mainDatabaseVersion, restoredDatabaseVersion] = await Promise.all([
        sqliteAPI.getDatabaseVersion(databaseIdentifier.MAIN),
        sqliteAPI.getDatabaseVersion(databaseIdentifier.RESTORED),
      ]);

      if (mainDatabaseVersion === restoredDatabaseVersion) {
        addLog(
          'User Data Restore',
          `Main and restored database versions are equal: ` +
            `${mainDatabaseVersion}, skipping schema migrations.`,
          new Set([logTypes.BACKUP]),
        );
      } else if (mainDatabaseVersion > restoredDatabaseVersion) {
        addLog(
          'User Data Restore',
          `Main database version (${mainDatabaseVersion}) is higher ` +
            `than restored database version (${restoredDatabaseVersion}), ` +
            `migrating schema.`,
          new Set([logTypes.BACKUP]),
        );
        await sqliteAPI.migrateBackupSchema();
      } else if (mainDatabaseVersion < restoredDatabaseVersion) {
        addLog(
          'User Data Restore',
          `Main database version (${mainDatabaseVersion}) is lower ` +
            `than restored database version (${restoredDatabaseVersion}), ` +
            ` aborting.`,
          new Set([logTypes.BACKUP, logTypes.ERROR]),
        );
        throw new Error('backup_is_newer');
      }

      // 3. Check store versions and migrate if needed
      const mainStoreVersion = getConfig().platformDetails.stateVersion;
      const restoredStoreVersionString = await sqliteAPI.getSyncedMetadata(
        syncedMetadataNames.STORE_VERSION,
        databaseIdentifier.RESTORED,
      );

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
        return;
      }

      const restoredStoreVersion = parseInt(restoredStoreVersionString);

      if (mainStoreVersion === restoredStoreVersion) {
        addLog(
          'User Data Restore',
          `Main and restored store versions are equal: ${mainStoreVersion}, ` +
            `skipping data migrations`,
          new Set([logTypes.BACKUP]),
        );
      } else if (mainStoreVersion > restoredStoreVersion) {
        addLog(
          'User Data Restore',
          `Main store version (${mainStoreVersion}) is higher than ` +
            `restored store version (${restoredStoreVersion}), migrating data`,
          new Set([logTypes.BACKUP]),
        );
        await runRestoredBackupMigrations();
      } else if (mainStoreVersion < restoredStoreVersion) {
        addLog(
          'User Data Restore',
          `Main store version (${mainStoreVersion}) is lower than ` +
            `restored store version (${restoredStoreVersion}), aborting`,
          new Set([logTypes.BACKUP, logTypes.ERROR]),
        );
        throw new Error('backup_is_newer');
      }

      // 4. Assign holders for the new device
      const holders = await sqliteAPI.getHolders(databaseIdentifier.RESTORED);
      const holderStoreOperations =
        await generateOpsToEstablishHoldersOnDevice(holders);
      await sqliteAPI.processDBStoreOperations(
        {
          holderStoreOperations,
        },
        databaseIdentifier.RESTORED,
      );

      // 5. Copy content to main database
      await sqliteAPI.copyContentFromBackupDatabase();

      // 6. Populate store
      const clientDBStore = await sqliteAPI.getClientDBStore(
        databaseIdentifier.MAIN,
        identityAuthResult.userID,
      );

      dispatch({
        type: setClientDBStoreActionType,
        payload: clientDBStore,
      });
    },
    [addLog, dispatch],
  );
}

export { useUserDataRestore };
