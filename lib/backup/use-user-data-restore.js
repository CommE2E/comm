// @flow

import invariant from 'invariant';
import * as React from 'react';

import { runRestoredBackupMigrations } from './restored-migrations.js';
import { restoreUserDataStepActionTypes } from '../actions/backup-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { logTypes, useDebugLogs } from '../components/debug-logs-context.js';
import type { RestoreUserDataStep } from '../types/backup-types.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import type { QRAuthBackupData } from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

function useUserDataRestore(): (
  backupData: QRAuthBackupData,
  identityAuthResult: IdentityAuthResult,
) => Promise<void> {
  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const { addLog } = useDebugLogs();
  const restoreBackupState = useSelector(state => state.restoreBackupState);

  return React.useCallback(
    async (
      backupData: QRAuthBackupData,
      identityAuthResult: IdentityAuthResult,
    ) => {
      const { sqliteAPI } = getConfig();

      // Determine starting step based on current state
      const stepOrder: $ReadOnlyArray<RestoreUserDataStep> = [
        'restore_database',
        'migrate_backup_schema',
        'run_restored_backup_migrations',
        'copy_content_from_backup_db',
      ];
      let startStepIndex = 0;

      if (restoreBackupState.status === 'user_data_restore_step_completed') {
        const completedStepIndex = stepOrder.indexOf(
          restoreBackupState.payload.step,
        );
        startStepIndex = completedStepIndex + 1;
      } else if (restoreBackupState.status === 'user_data_restore_started') {
        startStepIndex = stepOrder.indexOf(restoreBackupState.payload.step);
      } else {
        // for any other state, start from scratch
        startStepIndex = 0;
      }

      // if all steps from last restore succeeded, start from scratch
      if (startStepIndex > 3) {
        startStepIndex = 0;
      }

      invariant(startStepIndex >= 0, 'invalid UserData restore step');

      // 1. Download database and apply all logs
      if (startStepIndex === 0) {
        await dispatchActionPromise(
          restoreUserDataStepActionTypes,
          sqliteAPI.restoreUserData(backupData, identityAuthResult),
          undefined,
          { step: 'restore_database' },
        );
      }

      // 2. Check database versions and migrate if needed
      if (startStepIndex <= 1) {
        await dispatchActionPromise(
          restoreUserDataStepActionTypes,
          (async () => {
            const [mainDatabaseVersion, restoredDatabaseVersion] =
              await Promise.all([
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
          })(),
          undefined,
          { step: 'migrate_backup_schema' },
        );
      }

      // 3. Check store versions and migrate if needed
      if (startStepIndex <= 2) {
        await dispatchActionPromise(
          restoreUserDataStepActionTypes,
          (async () => {
            const mainStoreVersion = getConfig().platformDetails.stateVersion;
            const restoredStoreVersionString =
              await sqliteAPI.getSyncedMetadata(
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
              throw new Error('version_check_failed');
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
          })(),
          undefined,
          { step: 'run_restored_backup_migrations' },
        );
      }

      // 4. Copy content to main database
      if (startStepIndex <= 3) {
        await dispatchActionPromise(
          restoreUserDataStepActionTypes,
          sqliteAPI.copyContentFromBackupDatabase(),
          undefined,
          { step: 'copy_content_from_backup_db' },
        );
      }

      // 5. Populate store
      const clientDBStore = await sqliteAPI.getClientDBStore(
        databaseIdentifier.MAIN,
        identityAuthResult.userID,
      );

      dispatch({
        type: setClientDBStoreActionType,
        payload: clientDBStore,
      });
    },
    [addLog, dispatch, dispatchActionPromise, restoreBackupState],
  );
}

export { useUserDataRestore };
