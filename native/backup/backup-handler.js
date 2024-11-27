// @flow

import * as React from 'react';

import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useClientBackup } from './use-client-backup.js';
import { useGetBackupSecretForLoggedInUser } from './use-get-backup-secret.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

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
  const { createUserKeysBackup, retrieveLatestBackupInfo, getBackupUserKeys } =
    useClientBackup();
  const getBackupSecret = useGetBackupSecretForLoggedInUser();
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

  const testUserKeysRestore = React.useCallback(async () => {
    if (!latestBackupInfo?.backupID) {
      return;
    }
    const {
      latestBackupInfo: { backupID },
      userIdentifier,
    } = await retrieveLatestBackupInfo();

    const backupSecret = await getBackupSecret();
    const [
      {
        backupDataKey: backupDataKeyFromBackup,
        backupLogDataKey: backupLogDataKeyFromBackup,
      },
      {
        backupID: localBackupID,
        backupDataKey: localBackupDataKey,
        backupLogDataKey: localBackupLogDataKey,
      },
    ] = await Promise.all([
      getBackupUserKeys(userIdentifier, backupSecret, backupID),
      commCoreModule.getQRAuthBackupData(),
    ]);

    const backupIDCheck =
      latestBackupInfo.backupID === backupID && backupID === localBackupID;
    const keysCheck =
      backupDataKeyFromBackup === localBackupDataKey &&
      backupLogDataKeyFromBackup === localBackupLogDataKey;

    if (!backupIDCheck || !keysCheck) {
      throw new Error(
        '\n' +
          `backupID: ${backupID}\n` +
          `latestBackupInfo.backupID: ${latestBackupInfo.backupID}\n` +
          `localBackupID: ${localBackupID}\n` +
          `backupDataKeyFromBackup: ${backupDataKeyFromBackup}\n` +
          `backupLogDataKeyFromBackup: ${backupLogDataKeyFromBackup}\n` +
          `localBackupDataKey: ${localBackupDataKey}\n` +
          `localBackupLogDataKey: ${localBackupLogDataKey}\n`,
      );
    }
  }, [
    getBackupSecret,
    getBackupUserKeys,
    latestBackupInfo?.backupID,
    retrieveLatestBackupInfo,
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
      const isPrimaryDevice = await checkIfPrimaryDevice();
      if (!isPrimaryDevice) {
        backupUploadInProgress.current = false;
        return;
      }

      if (latestBackupInfo) {
        const timestamp = latestBackupInfo.timestamp;
        // If last upload one less than 24h ago ignore it
        if (timestamp >= Date.now() - millisecondsPerDay) {
          backupUploadInProgress.current = false;
          return;
        }

        try {
          await testUserKeysRestore();
        } catch (err) {
          const message = getMessageForException(err) ?? 'unknown error';
          showAlertToStaff('Error restoring User Keys backup', message);
          console.log('Error restoring User Keys backup:', message);
        }
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
    testUserKeysRestore,
  ]);

  return null;
}

export default BackupHandler;
