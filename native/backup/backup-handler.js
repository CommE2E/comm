// @flow

import * as React from 'react';

import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useClientBackup } from './use-client-backup.js';
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
  const [handlerStarted, setHandlerStarted] = React.useState(false);

  React.useEffect(() => {
    if (!staffCanSee) {
      return;
    }

    void (async () => {
      const isPrimaryDevice = await checkIfPrimaryDevice();
      if (!isPrimaryDevice) {
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
      backupUploadInProgress.current ||
      !!latestBackupInfo
    ) {
      return;
    }

    void (async () => {
      backupUploadInProgress.current = true;
      const isPrimaryDevice = await checkIfPrimaryDevice();
      if (!isPrimaryDevice) {
        backupUploadInProgress.current = false;
        return;
      }

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
        const message = getMessageForException(err) ?? 'unknown error';
        showAlertToStaff('Error creating User Keys backup', message);
        console.log('Error creating User Keys backup:', message);
      }
      backupUploadInProgress.current = false;
    })();
  }, [
    canPerformBackupOperation,
    checkIfPrimaryDevice,
    createUserKeysBackup,
    dispatchActionPromise,
    handlerStarted,
    latestBackupInfo,
    showAlertToStaff,
    staffCanSee,
  ]);

  return null;
}

export default BackupHandler;
