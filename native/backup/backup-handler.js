// @flow

import invariant from 'invariant';
import * as React from 'react';

import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import {
  useCurrentIdentityUserState,
  type CurrentIdentityUserState,
} from 'lib/hooks/peer-list-hooks.js';
import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
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
  const checkIfPrimaryDevice = useCheckIfPrimaryDevice();
  const { showAlertToStaff } = useStaffAlert();
  const latestBackupInfo = useSelector(
    state => state.backupStore.latestBackupInfo,
  );
  const dispatchActionPromise = useDispatchActionPromise();
  const { createUserKeysBackup } = useClientBackup();
  const backupUploadInProgress = React.useRef<boolean>(false);
  const startingBackupHandlerInProgress = React.useRef<boolean>(false);
  const [handlerStarted, setHandlerStarted] = React.useState(false);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  const getCurrentIdentityUserState = useCurrentIdentityUserState();
  const migrateToNewFlow = useMigrationToNewFlow();

  React.useEffect(() => {
    if (!staffCanSee || startingBackupHandlerInProgress.current) {
      return;
    }

    void (async () => {
      startingBackupHandlerInProgress.current = true;
      const isPrimaryDevice = await checkIfPrimaryDevice();
      if (!isPrimaryDevice) {
        startingBackupHandlerInProgress.current = false;
        return;
      }

      if (!handlerStarted && canPerformBackupOperation) {
        try {
          commCoreModule.startBackupHandler();
          setHandlerStarted(true);
        } catch (err) {
          const message = getMessageForException(err) ?? 'unknown error';
          showAlertToStaff('Error starting backup handler', message);
          console.log('Error starting backup handler:', message);
        }
      }

      if (handlerStarted && !canPerformBackupOperation) {
        try {
          commCoreModule.stopBackupHandler();
          setHandlerStarted(false);
        } catch (err) {
          const message = getMessageForException(err) ?? 'unknown error';
          showAlertToStaff('Error stopping backup handler', message);
          console.log('Error stopping backup handler:', message);
        }
      }
      startingBackupHandlerInProgress.current = false;
    })();
  }, [
    canPerformBackupOperation,
    checkIfPrimaryDevice,
    handlerStarted,
    showAlertToStaff,
    staffCanSee,
  ]);

  React.useEffect(() => {
    if (
      !staffCanSee ||
      !canPerformBackupOperation ||
      !handlerStarted ||
      backupUploadInProgress.current
    ) {
      return;
    }

    void (async () => {
      backupUploadInProgress.current = true;

      const [isPrimaryDevice, { userID, deviceID }] = await Promise.all([
        checkIfPrimaryDevice(),
        getAuthMetadata(),
      ]);

      // CurrentIdentityUserState is required to check if migration to
      // new flow is needed.
      let currentIdentityUserState: ?CurrentIdentityUserState = null;
      try {
        currentIdentityUserState = await getCurrentIdentityUserState(userID);
      } catch (err) {
        const message = getMessageForException(err) ?? 'unknown error';
        showAlertToStaff('Error fetching current device list:', message);
        console.log('Error fetching current device list:', message);
        backupUploadInProgress.current = false;
        return;
      }

      const deviceListIsSigned =
        currentIdentityUserState.currentDeviceList.curPrimarySignature;

      // Early return is safe:
      // - in the case of non-primary device, the attempt to upload
      //   a backup is not needed
      // - in the case of a signed device list there is no need
      //   to perform the migration.
      if (!isPrimaryDevice && deviceListIsSigned) {
        backupUploadInProgress.current = false;
        return;
      }

      const shouldDoMigration =
        usingRestoreFlow && (!latestBackupInfo || !deviceListIsSigned);
      if (!shouldDoMigration && !isPrimaryDevice) {
        backupUploadInProgress.current = false;
        return;
      }
      try {
        const promise = (async () => {
          if (shouldDoMigration && !deviceListIsSigned) {
            return await migrateToNewFlow(
              userID,
              deviceID,
              currentIdentityUserState,
            );
          } else {
            const backupID = await createUserKeysBackup();
            return {
              backupID,
              timestamp: Date.now(),
            };
          }
        })();
        void dispatchActionPromise(createUserKeysBackupActionTypes, promise);
        await promise;
      } catch (err) {
        const errorMessage = getMessageForException(err) ?? 'unknown error';
        const errorTitle = shouldDoMigration
          ? 'migrating to signed device lists'
          : 'creating User Keys backup';
        showAlertToStaff(`Error ${errorTitle}`, errorMessage);
        console.log(`Error ${errorTitle}:`, errorMessage);
      }
      backupUploadInProgress.current = false;
    })();
  }, [
    canPerformBackupOperation,
    checkIfPrimaryDevice,
    createUserKeysBackup,
    dispatchActionPromise,
    getAuthMetadata,
    getCurrentIdentityUserState,
    handlerStarted,
    latestBackupInfo,
    migrateToNewFlow,
    showAlertToStaff,
    staffCanSee,
  ]);

  return null;
}

export default BackupHandler;
