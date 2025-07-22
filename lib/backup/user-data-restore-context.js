// @flow

import invariant from 'invariant';
import * as React from 'react';

import { runRestoredBackupMigrations } from './restored-migrations.js';
import {
  getStoreAndDatabaseVersions,
  type StoreAndDatabaseVersions,
} from './use-user-data-utils.js';
import { restoreUserDataStepActionTypes } from '../actions/backup-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { generateOpsToEstablishHoldersOnDevice } from '../actions/holder-actions.js';
import { logTypes, useDebugLogs } from '../components/debug-logs-context.js';
import type { RestoreUserDataStep } from '../types/backup-types.js';
import { restoreUserDataSteps } from '../types/backup-types.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import type { QRAuthBackupData } from '../types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from '../utils/config.js';
import { BackupIsNewerError } from '../utils/errors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type UserDataRestoreContextType = {
  +userDataRestore: (
    userID: string,
    accessToken: string,
    backupData: ?QRAuthBackupData,
  ) => Promise<void>,
  +isRestoring: boolean,
};

const UserDataRestoreContext: React.Context<?UserDataRestoreContextType> =
  React.createContext<?UserDataRestoreContextType>(null);

type Props = {
  +children: React.Node,
};

function UserDataRestoreProvider(props: Props): React.Node {
  const { children } = props;
  const restorePromiseRef = React.useRef<?Promise<void>>(null);
  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const { addLog } = useDebugLogs();
  const restoreBackupState = useSelector(state => state.restoreBackupState);

  const executeRestoreUserData = React.useCallback(
    async (
      userID: string,
      accessToken: string,
      backupData: ?QRAuthBackupData,
    ) => {
      const { sqliteAPI } = getConfig();

      // Determine starting step based on current state
      const stepOrder: $ReadOnlyArray<RestoreUserDataStep> = [
        restoreUserDataSteps.RESTORE_DATABASE,
        restoreUserDataSteps.MIGRATE_BACKUP_SCHEMA,
        restoreUserDataSteps.RUN_RESTORED_BACKUP_MIGRATIONS,
        restoreUserDataSteps.ASSIGN_NEW_HOLDERS,
        restoreUserDataSteps.COPY_CONTENT_FROM_BACKUP_DB,
      ];
      let startStepIndex = 0;

      if (restoreBackupState.status === 'user_data_restore_step_completed') {
        const completedStepIndex = stepOrder.indexOf(
          restoreBackupState.payload.step,
        );
        startStepIndex = completedStepIndex + 1;
      } else if (
        restoreBackupState.status === 'user_data_restore_started' ||
        restoreBackupState.status === 'user_data_restore_failed'
      ) {
        startStepIndex = stepOrder.indexOf(restoreBackupState.payload.step);
      } else {
        // for any other state, start from scratch
        startStepIndex = 0;
      }

      // if all steps from last restore succeeded, start from scratch
      if (startStepIndex > 4) {
        startStepIndex = 0;
      }

      invariant(startStepIndex >= 0, 'invalid UserData restore step');

      // 1. Download database and apply all logs
      if (startStepIndex === 0) {
        invariant(
          backupData,
          'backupData should exist when starting from scratch',
        );
        const restoreUserDataPromise = sqliteAPI.restoreUserData(
          backupData,
          userID,
          accessToken,
        );
        void dispatchActionPromise(
          restoreUserDataStepActionTypes,
          restoreUserDataPromise,
          undefined,
          { step: 'restore_database' },
        );
        await restoreUserDataPromise;
      }

      // 2. Check database versions and migrate if needed
      let storeAndDatabaseVersions: ?StoreAndDatabaseVersions = null;
      if (startStepIndex <= 1) {
        const migrateBackupSchemaPromise = (async () => {
          storeAndDatabaseVersions = await getStoreAndDatabaseVersions(addLog);
          const {
            mainDatabaseVersion,
            restoredDatabaseVersion,
            restoredStoreVersion,
          } = storeAndDatabaseVersions;

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
            throw new BackupIsNewerError(
              'backup_is_newer',
              restoredDatabaseVersion,
              restoredStoreVersion,
            );
          }
        })();
        void dispatchActionPromise(
          restoreUserDataStepActionTypes,
          migrateBackupSchemaPromise,
          undefined,
          { step: 'migrate_backup_schema' },
        );
        await migrateBackupSchemaPromise;
      }

      // 3. Check store versions and migrate if needed
      if (startStepIndex <= 2) {
        const runRestoredMigrationsPromise = (async () => {
          if (!storeAndDatabaseVersions) {
            // There is a chance of restarting this process from this
            // condition, in that case versions might be missing
            storeAndDatabaseVersions =
              await getStoreAndDatabaseVersions(addLog);
          }
          const {
            mainStoreVersion,
            restoredStoreVersion,
            restoredDatabaseVersion,
          } = storeAndDatabaseVersions;
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
            await runRestoredBackupMigrations(restoredDatabaseVersion);
          } else if (mainStoreVersion < restoredStoreVersion) {
            addLog(
              'User Data Restore',
              `Main store version (${mainStoreVersion}) is lower than ` +
                `restored store version (${restoredStoreVersion}), aborting`,
              new Set([logTypes.BACKUP, logTypes.ERROR]),
            );
            throw new BackupIsNewerError(
              'backup_is_newer',
              restoredDatabaseVersion,
              restoredStoreVersion,
            );
          }
        })();
        void dispatchActionPromise(
          restoreUserDataStepActionTypes,
          runRestoredMigrationsPromise,
          undefined,
          { step: 'run_restored_backup_migrations' },
        );
        await runRestoredMigrationsPromise;
      }

      // 4. Assign holders for the new device
      if (startStepIndex <= 3) {
        const assignHoldersPromise = (async () => {
          const holders = await sqliteAPI.getHolders(
            databaseIdentifier.RESTORED,
          );
          const holderStoreOperations =
            await generateOpsToEstablishHoldersOnDevice(holders);
          await sqliteAPI.processDBStoreOperations(
            {
              holderStoreOperations,
            },
            databaseIdentifier.RESTORED,
          );
        })();
        void dispatchActionPromise(
          restoreUserDataStepActionTypes,
          assignHoldersPromise,
          undefined,
          { step: 'assign_new_holders' },
        );
        await assignHoldersPromise;
      }

      // 5. Copy content to main database
      if (startStepIndex <= 4) {
        const copyContentPromise = sqliteAPI.copyContentFromBackupDatabase();
        void dispatchActionPromise(
          restoreUserDataStepActionTypes,
          copyContentPromise,
          undefined,
          { step: 'copy_content_from_backup_db' },
        );
        await copyContentPromise;
      }

      // 6. Populate store
      const clientDBStore = await sqliteAPI.getClientDBStore(
        databaseIdentifier.MAIN,
        userID,
      );

      dispatch({
        type: setClientDBStoreActionType,
        payload: clientDBStore,
      });
    },
    [addLog, dispatch, dispatchActionPromise, restoreBackupState],
  );

  const userDataRestore = React.useCallback(
    async (
      userID: string,
      accessToken: string,
      backupData: ?QRAuthBackupData,
    ): Promise<void> => {
      if (restorePromiseRef.current) {
        return restorePromiseRef.current;
      }

      const promise = (async () => {
        try {
          await executeRestoreUserData(userID, accessToken, backupData);
        } finally {
          restorePromiseRef.current = null;
        }
      })();

      restorePromiseRef.current = promise;
      return promise;
    },
    [executeRestoreUserData],
  );

  const contextValue: UserDataRestoreContextType = React.useMemo(
    () => ({
      userDataRestore,
      isRestoring: restorePromiseRef.current !== null,
    }),
    [userDataRestore],
  );

  return (
    <UserDataRestoreContext.Provider value={contextValue}>
      {children}
    </UserDataRestoreContext.Provider>
  );
}

function useUserDataRestoreContext(): UserDataRestoreContextType {
  const userDataRestoreContext = React.useContext(UserDataRestoreContext);
  invariant(userDataRestoreContext, 'userDataRestoreContext should be set');
  return userDataRestoreContext;
}

export { UserDataRestoreProvider, useUserDataRestoreContext };
