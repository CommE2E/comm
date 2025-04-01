// @flow

import * as React from 'react';

import { setPeerDeviceListsActionType } from 'lib/actions/aux-user-actions.js';
import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import {
  useCurrentIdentityUserState,
  type CurrentIdentityUserState,
} from 'lib/hooks/peer-list-hooks.js';
import { usePersistedStateLoaded } from 'lib/selectors/app-state-selectors.js';
import {
  getOwnRawDeviceList,
  isLoggedIn,
} from 'lib/selectors/user-selectors.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { rawDeviceListFromSignedList } from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  fullBackupSupport,
  useIsRestoreFlowEnabled,
} from 'lib/utils/services-utils.js';

import { BackupHandlerContext } from './backup-handler-context.js';
import { useClientBackup } from './use-client-backup.js';
import { useMigrationToNewFlow } from './use-migration-to-new-flow.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +children: React.Node,
};

function BackupHandlerContextProvider(props: Props): React.Node {
  const { showAlertToStaff } = useStaffAlert();

  const getCurrentIdentityUserState = useCurrentIdentityUserState();
  const { socketState } = useTunnelbroker();
  const migrateToNewFlow = useMigrationToNewFlow();
  const { createUserKeysBackup } = useClientBackup();
  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();

  const persistedStateLoaded = usePersistedStateLoaded();
  const ownRawDeviceList = useSelector(getOwnRawDeviceList);
  const latestBackupInfo = useSelector(
    state => state.backupStore.latestBackupInfo,
  );
  const loggedIn = useSelector(isLoggedIn);
  const isBackground = useSelector(
    state => state.lifecycleState === 'background',
  );
  const canPerformBackupOperation = loggedIn && !isBackground;

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

  const performBackupUpload = React.useCallback(async () => {
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

  React.useEffect(() => {
    if (fullBackupSupport && canPerformBackupOperation) {
      startBackupHandler();
    } else if (!canPerformBackupOperation) {
      stopBackupHandler();
    }
  }, [canPerformBackupOperation, startBackupHandler, stopBackupHandler]);

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

      step = 'computing conditions';
      const shouldDoMigration =
        usingRestoreFlow && !currentDeviceList.curPrimarySignature;
      const shouldUploadBackup = isPrimary && !latestBackupInfo;

      // Tunnelbroker connection is required to broadcast
      // device list updates after migration.
      if (shouldDoMigration && !socketState.isAuthorized) {
        return;
      }

      // Migration or backup upload are not needed.
      if (!shouldDoMigration && !shouldUploadBackup) {
        return;
      }

      step = 'starting backup handler';
      startBackupHandler();

      // Migration is performed regardless of device kind.
      if (shouldDoMigration) {
        step = 'migrating to signed device lists';
        await performMigrationToNewFlow(currentIdentityUserState);
      } else if (shouldUploadBackup) {
        step = 'creating User Keys backup';
        await performBackupUpload();
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
    ownRawDeviceList,
    performBackupUpload,
    performMigrationToNewFlow,
    showAlertToStaff,
    socketState.isAuthorized,
    startBackupHandler,
    usingRestoreFlow,
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
