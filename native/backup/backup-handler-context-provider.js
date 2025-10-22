// @flow

import * as React from 'react';

import { setPeerDeviceListsActionType } from 'lib/actions/aux-user-actions.js';
import {
  createUserDataBackupActionTypes,
  type CreateUserDataBackupPayload,
  createUserKeysBackupActionTypes,
} from 'lib/actions/backup-actions.js';
import {
  useCurrentIdentityUserState,
  type CurrentIdentityUserState,
} from 'lib/hooks/peer-list-hooks.js';
import { usePersistedStateLoaded } from 'lib/selectors/app-state-selectors.js';
import {
  getOwnPeerDevices,
  getOwnRawDeviceList,
  isLoggedIn,
} from 'lib/selectors/user-selectors.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { type LocalLatestBackupInfo } from 'lib/types/backup-types.js';
import { databaseIdentifier } from 'lib/types/database-identifier-types.js';
import { identityDeviceTypes } from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';
import { rawDeviceListFromSignedList } from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  useFullBackupSupportEnabled,
  useIsRestoreFlowEnabled,
} from 'lib/utils/services-utils.js';

import { BackupHandlerContext } from './backup-handler-context.js';
import { useClientBackup } from './use-client-backup.js';
import { useMigrationToNewFlow } from './use-migration-to-new-flow.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

// One week in milliseconds
const backupInterval = 7 * 24 * 60 * 60 * 1000;

function checkIfCompactionNeeded(
  latestBackupInfo: ?LocalLatestBackupInfo,
  fullBackupSupport: boolean,
): boolean {
  if (!fullBackupSupport) {
    return false;
  }
  if (!latestBackupInfo) {
    return false;
  }

  return Date.now() - latestBackupInfo.timestamp >= backupInterval;
}

type Props = {
  +children: React.Node,
};

function BackupHandlerContextProvider(props: Props): React.Node {
  const { showAlertToStaff } = useStaffAlert();

  const getCurrentIdentityUserState = useCurrentIdentityUserState();
  const { socketState } = useTunnelbroker();
  const migrateToNewFlow = useMigrationToNewFlow();
  const { createUserKeysBackup, createUserDataBackup } = useClientBackup();
  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();

  const persistedStateLoaded = usePersistedStateLoaded();
  const ownRawDeviceList = useSelector(getOwnRawDeviceList);
  const latestBackupInfo = useSelector(
    state => state.backupStore.latestBackupInfo,
  );
  const latestDatabaseVersion = useSelector(
    state => state.backupStore?.latestDatabaseVersion,
  );
  const loggedIn = useSelector(isLoggedIn);
  const isBackground = useSelector(
    state => state.lifecycleState === 'background',
  );
  const canPerformBackupOperation = loggedIn && !isBackground;

  const restoreBackupState = useSelector(state => state.restoreBackupState);

  // State to force re-render.
  const [renderCount, setRenderCount] = React.useState(0);
  const completionRef = React.useRef({ running: false, required: false });
  const handlerStartedRef = React.useRef(false);

  const performMigrationToNewFlow = React.useCallback(
    async (currentIdentityUserState: CurrentIdentityUserState) => {
      const promise = migrateToNewFlow(currentIdentityUserState);
      void dispatchActionPromise(createUserKeysBackupActionTypes, promise);
      await promise;
    },
    [dispatchActionPromise, migrateToNewFlow],
  );

  const ownDevices = useSelector(getOwnPeerDevices);
  const performUserKeysUpload = React.useCallback(async () => {
    const promise = (async () => {
      const backupID = await createUserKeysBackup();
      return {
        backupID,
        timestamp: Date.now(),
      };
    })();
    void dispatchActionPromise(createUserKeysBackupActionTypes, promise);
    await promise;
  }, [createUserKeysBackup, dispatchActionPromise]);

  const performUserDataUpload = React.useCallback(
    async (firstUserDataUpload: boolean, currentDeviceID: string) => {
      const ownDevicesWithoutBackup: Array<string> = [];
      if (firstUserDataUpload) {
        const ownSecondaryDevices = ownDevices
          .filter(
            ({ deviceID, platformDetails }) =>
              deviceID !== currentDeviceID &&
              platformDetails?.deviceType !== identityDeviceTypes.KEYSERVER,
          )
          .map(({ deviceID }) => deviceID);
        ownDevicesWithoutBackup.push(...ownSecondaryDevices);
      }

      const promise: Promise<CreateUserDataBackupPayload> = (async () => {
        const { sqliteAPI } = getConfig();
        const databaseVersion = await sqliteAPI.getDatabaseVersion(
          databaseIdentifier.MAIN,
        );
        const backupID = await createUserDataBackup();
        return {
          latestBackupInfo: {
            backupID,
            timestamp: Date.now(),
          },
          latestDatabaseVersion: databaseVersion,
        };
      })();
      void dispatchActionPromise(
        createUserDataBackupActionTypes,
        promise,
        undefined,
        { ownDevicesWithoutBackup },
      );
      await promise;
    },
    [createUserDataBackup, dispatchActionPromise, ownDevices],
  );

  const startBackupHandler = React.useCallback(() => {
    if (handlerStartedRef.current) {
      return;
    }

    commCoreModule.startBackupHandler();
    handlerStartedRef.current = true;
  }, []);

  const stopBackupHandler = React.useCallback(() => {
    if (!handlerStartedRef.current) {
      return;
    }

    commCoreModule.stopBackupHandler();
    handlerStartedRef.current = false;
  }, []);

  const fullBackupSupport = useFullBackupSupportEnabled();

  React.useEffect(() => {
    if (fullBackupSupport && canPerformBackupOperation) {
      startBackupHandler();
    } else if (!canPerformBackupOperation) {
      stopBackupHandler();
    }
  }, [
    canPerformBackupOperation,
    startBackupHandler,
    stopBackupHandler,
    fullBackupSupport,
  ]);

  const usingRestoreFlow = useIsRestoreFlowEnabled();

  const process = React.useCallback(async () => {
    let step = 'starting backup handler';
    try {
      if (!canPerformBackupOperation) {
        return;
      }

      // It is important to use Identity Service as a source of truth
      // in case of a migration process because local device lists
      // might be out-of-date.
      step = 'fetching current device list';
      const currentIdentityUserState = await getCurrentIdentityUserState();
      const {
        currentDeviceList,
        currentUserPlatformDetails,
        userID,
        deviceID,
      } = currentIdentityUserState;

      // After fetching, it is worth checking if the local state is the same,
      // in case of inconsistency perform the update.
      step = 'validating current device list consistency';
      const currentRawDeviceList =
        rawDeviceListFromSignedList(currentDeviceList);
      if (
        JSON.stringify(ownRawDeviceList?.devices) !==
        JSON.stringify(currentRawDeviceList.devices)
      ) {
        console.log(
          "Local device list state wasn't updated yet - updating it now",
        );
        dispatch({
          type: setPeerDeviceListsActionType,
          payload: {
            deviceLists: {
              [userID]: currentRawDeviceList,
            },
            usersPlatformDetails: {
              [userID]: currentUserPlatformDetails,
            },
          },
        });
      }

      // Based on the response from Identity determine if the device
      // is primary.
      step = 'checking if device is primary';
      const isPrimary =
        currentRawDeviceList.devices.length > 0 &&
        currentRawDeviceList.devices[0] === deviceID;

      step = 'checking database version';
      let databaseSchemaChanged = false;
      if (fullBackupSupport && isPrimary && latestDatabaseVersion) {
        const { sqliteAPI } = getConfig();
        const databaseVersion = await sqliteAPI.getDatabaseVersion(
          databaseIdentifier.MAIN,
        );
        databaseSchemaChanged = databaseVersion !== latestDatabaseVersion;
      }

      step = 'computing conditions';
      const shouldDoMigration =
        usingRestoreFlow && !currentDeviceList.curPrimarySignature;

      const userKeyUploadFailed =
        restoreBackupState.status === 'user_keys_backup_failed' ||
        restoreBackupState.status === 'user_keys_backup_started';
      const shouldUploadUserKeys =
        isPrimary && (!latestBackupInfo || userKeyUploadFailed);

      // App has UserKeys backup, but without UserData, and this is the first
      // ever compaction upload (after restore or registration).
      const firstUserDataUpload =
        restoreBackupState.status === 'no_backup' ||
        restoreBackupState.status === 'user_data_restore_completed';

      // When previous upload failed, device should restart it.
      const userDataUploadFailed =
        restoreBackupState.status === 'user_data_backup_failed';

      // Allow compaction only when UserData restoration is completed,
      // or after the previous compaction has finished uploading.
      const userDataCompactionPossible =
        restoreBackupState.status === 'user_data_restore_completed' ||
        restoreBackupState.status === 'user_data_backup_success';

      // Check if another compaction is needed, but only when the
      // device is in a state where this is possible.
      const compactionNeeded =
        (checkIfCompactionNeeded(latestBackupInfo, fullBackupSupport) ||
          databaseSchemaChanged) &&
        userDataCompactionPossible;

      const shouldUploadUserData =
        isPrimary &&
        (firstUserDataUpload || userDataUploadFailed || compactionNeeded);

      // Tunnelbroker connection is required to broadcast
      // device list updates after migration.
      if (shouldDoMigration && !socketState.isAuthorized) {
        return;
      }

      // Migration or backup upload are not needed.
      if (
        !shouldDoMigration &&
        !shouldUploadUserKeys &&
        !shouldUploadUserData
      ) {
        return;
      }

      step = 'starting backup handler';
      startBackupHandler();

      // Migration is performed regardless of device kind.
      if (shouldDoMigration) {
        step = 'migrating to signed device lists';
        await performMigrationToNewFlow(currentIdentityUserState);
      } else if (shouldUploadUserData && fullBackupSupport) {
        step = 'creating User Data backup';
        await performUserDataUpload(firstUserDataUpload, deviceID);
      } else if (shouldUploadUserKeys) {
        step = 'creating User Keys backup';
        await performUserKeysUpload();
      }
    } catch (err) {
      const errorMessage = getMessageForException(err) ?? 'unknown error';
      const title = `Error ${step}`;
      showAlertToStaff(title, errorMessage);
      console.log(title, errorMessage);
    } finally {
      completionRef.current.running = false;
      if (completionRef.current.required) {
        // Incrementing to trigger re-render. Using state instead of ref
        // to make sure the next execution is using updated version
        // of the `process()` callback.
        setRenderCount(prev => prev + 1);
      }
    }
  }, [
    canPerformBackupOperation,
    dispatch,
    getCurrentIdentityUserState,
    latestBackupInfo,
    latestDatabaseVersion,
    ownRawDeviceList,
    performMigrationToNewFlow,
    performUserDataUpload,
    performUserKeysUpload,
    restoreBackupState.status,
    showAlertToStaff,
    socketState.isAuthorized,
    startBackupHandler,
    usingRestoreFlow,
    fullBackupSupport,
  ]);

  React.useEffect(() => {
    if (!usingRestoreFlow || !persistedStateLoaded) {
      return;
    }

    if (completionRef.current.running) {
      completionRef.current.required = true;
    } else {
      completionRef.current.running = true;
      completionRef.current.required = false;
      void process();
    }
  }, [persistedStateLoaded, process, renderCount, usingRestoreFlow]);

  const contextValue = React.useMemo(
    () => ({
      scheduleBackup: () => setRenderCount(prev => prev + 1),
    }),
    [],
  );

  return (
    <BackupHandlerContext.Provider value={contextValue}>
      {props.children}
    </BackupHandlerContext.Provider>
  );
}

export default BackupHandlerContextProvider;
