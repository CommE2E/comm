// @flow

import * as React from 'react';

import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useClientBackup } from './use-client-backup.js';
import { useGetBackupSecretForLoggedInUser } from './use-get-backup-secret.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import Alert from '../utils/alert.js';
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
          Alert.alert('Error starting backup handler', message);
          console.log('Error starting backup handler:', message);
        }
      }

      if (handlerStarted && !canPerformBackupOperation) {
        try {
          console.log('stopping');
          commCoreModule.stopBackupHandler();
          setHandlerStarted(false);
        } catch (err) {
          const message = getMessageForException(err) ?? 'unknown error';
          Alert.alert('Error stopping backup handler', message);
          console.log('Error stopping backup handler:', message);
        }
      }
    })();
  }, [
    staffCanSee,
    loggedIn,
    isBackground,
    checkIfPrimaryDevice,
    canPerformBackupOperation,
    handlerStarted,
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
    const {
      backupDataKey: backupDataKeyFromBackup,
      backupLogDataKey: backupLogDataKeyFromBackup,
    } = await getBackupUserKeys(userIdentifier, backupSecret, backupID);

    const {
      backupID: localBackupID,
      backupDataKey: localBackupDataKey,
      backupLogDataKey: localBackupLogDataKey,
    } = await commCoreModule.getQRAuthBackupData();

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
          Alert.alert('Error restoring User Keys backup', message);
          console.log('Error restoring User Keys backup:', message);
        }
      }

      try {
        const promise = createUserKeysBackup();
        void dispatchActionPromise(createUserKeysBackupActionTypes, promise);
        await promise;
      } catch (err) {
        const message = getMessageForException(err) ?? 'unknown error';
        Alert.alert('Error creating User Keys backup', message);
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
    staffCanSee,
    testUserKeysRestore,
  ]);

  return null;
}

export default BackupHandler;
