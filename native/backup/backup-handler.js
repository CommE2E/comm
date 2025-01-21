// @flow

import * as React from 'react';

import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import {
  useCurrentIdentityUserState,
  type CurrentIdentityUserState,
} from 'lib/hooks/peer-list-hooks.js';
import { useDeviceKind } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { usingRestoreFlow } from 'lib/utils/services-utils.js';

import { useClientBackup } from './use-client-backup.js';
import { useMigrationToNewFlow } from './use-migration-to-new-flow.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function BackupHandler(): null {
  const loggedIn = useSelector(isLoggedIn);
  const staffCanSee = useStaffCanSee();
  const isBackground = useSelector(
    state => state.lifecycleState === 'background',
  );
  const canPerformBackupOperation = loggedIn && !isBackground;
  const deviceKind = useDeviceKind();
  const { showAlertToStaff } = useStaffAlert();
  const latestBackupInfo = useSelector(
    state => state.backupStore.latestBackupInfo,
  );
  const dispatchActionPromise = useDispatchActionPromise();
  const { createUserKeysBackup } = useClientBackup();
  const backupUploadInProgress = React.useRef<boolean>(false);
  const startingBackupHandlerInProgress = React.useRef<boolean>(false);
  const [handlerStarted, setHandlerStarted] = React.useState(false);

  const getCurrentIdentityUserState = useCurrentIdentityUserState();
  const migrateToNewFlow = useMigrationToNewFlow();
  const { socketState } = useTunnelbroker();

  const startBackupHandler = React.useCallback(() => {
    try {
      commCoreModule.startBackupHandler();
      setHandlerStarted(true);
    } catch (err) {
      const message = getMessageForException(err) ?? 'unknown error';
      showAlertToStaff('Error starting backup handler', message);
      console.log('Error starting backup handler:', message);
    }
  }, [showAlertToStaff]);

  const stopBackupHandler = React.useCallback(() => {
    try {
      commCoreModule.stopBackupHandler();
      setHandlerStarted(false);
    } catch (err) {
      const message = getMessageForException(err) ?? 'unknown error';
      showAlertToStaff('Error stopping backup handler', message);
      console.log('Error stopping backup handler:', message);
    }
  }, [showAlertToStaff]);

  React.useEffect(() => {
    if (
      !staffCanSee ||
      startingBackupHandlerInProgress.current ||
      deviceKind !== 'primary'
    ) {
      return;
    }

    if (!handlerStarted && canPerformBackupOperation) {
      startBackupHandler();
    }

    if (handlerStarted && !canPerformBackupOperation) {
      stopBackupHandler();
    }
  }, [
    canPerformBackupOperation,
    deviceKind,
    handlerStarted,
    staffCanSee,
    startBackupHandler,
    stopBackupHandler,
  ]);

  const performMigrationToNewFlow = React.useCallback(
    async (currentIdentityUserState: CurrentIdentityUserState) => {
      try {
        const promise = migrateToNewFlow(currentIdentityUserState);
        void dispatchActionPromise(createUserKeysBackupActionTypes, promise);
        await promise;
      } catch (err) {
        const errorMessage = getMessageForException(err) ?? 'unknown error';
        showAlertToStaff(
          'Error migrating to signed device lists',
          errorMessage,
        );
        console.log('Error migrating to signed device lists', errorMessage);
      }
    },
    [dispatchActionPromise, migrateToNewFlow, showAlertToStaff],
  );

  const performBackupUpload = React.useCallback(async () => {
    try {
      const promise = (async () => {
        const backupID = await createUserKeysBackup();
        return {
          backupID,
          timestamp: Date.now(),
        };
      })();
      void dispatchActionPromise(createUserKeysBackupActionTypes, promise);
      await promise;
    } catch (err) {
      const errorMessage = getMessageForException(err) ?? 'unknown error';
      showAlertToStaff('Error creating User Keys backup', errorMessage);
      console.log('Error creating User Keys backup', errorMessage);
    }
  }, [createUserKeysBackup, dispatchActionPromise, showAlertToStaff]);

  React.useEffect(() => {
    if (
      !staffCanSee ||
      !canPerformBackupOperation ||
      backupUploadInProgress.current ||
      deviceKind === 'unknown'
    ) {
      return;
    }

    // In case of primary we need to wait for starting the handler.
    // In case of secondary, we want to proceed and start handler
    // on demand.
    if (deviceKind === 'primary' && !handlerStarted) {
      return;
    }

    void (async () => {
      backupUploadInProgress.current = true;

      // CurrentIdentityUserState is required to check if migration to
      // new flow is needed.
      let currentIdentityUserState: ?CurrentIdentityUserState = null;
      try {
        currentIdentityUserState = await getCurrentIdentityUserState();
      } catch (err) {
        const message = getMessageForException(err) ?? 'unknown error';
        showAlertToStaff('Error fetching current device list:', message);
        console.log('Error fetching current device list:', message);
        backupUploadInProgress.current = false;
        return;
      }

      const shouldDoMigration =
        usingRestoreFlow &&
        !currentIdentityUserState.currentDeviceList.curPrimarySignature;

      if (shouldDoMigration && !socketState.isAuthorized) {
        backupUploadInProgress.current = false;
        return;
      }

      if (shouldDoMigration && deviceKind === 'primary') {
        await performMigrationToNewFlow(currentIdentityUserState);
      } else if (shouldDoMigration && deviceKind === 'secondary') {
        startBackupHandler();
        await performMigrationToNewFlow(currentIdentityUserState);
      } else if (deviceKind === 'primary' && !latestBackupInfo) {
        await performBackupUpload();
      }

      backupUploadInProgress.current = false;
    })();
  }, [
    canPerformBackupOperation,
    deviceKind,
    getCurrentIdentityUserState,
    handlerStarted,
    latestBackupInfo,
    performBackupUpload,
    performMigrationToNewFlow,
    showAlertToStaff,
    socketState.isAuthorized,
    staffCanSee,
    startBackupHandler,
  ]);

  return null;
}

export default BackupHandler;
