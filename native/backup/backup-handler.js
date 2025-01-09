// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from 'lib/actions/aux-user-actions.js';
import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import {
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
} from 'lib/hooks/peer-list-hooks.js';
import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn, getAllPeerDevices } from 'lib/selectors/user-selectors.js';
import { signDeviceListUpdate } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import type {
  RawDeviceList,
  SignedDeviceList,
} from 'lib/types/identity-service-types.js';
import {
  composeRawDeviceList,
  rawDeviceListFromSignedList,
} from 'lib/utils/device-list-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingRestoreFlow } from 'lib/utils/services-utils.js';

import { useClientBackup } from './use-client-backup.js';
import { useGetBackupSecretForLoggedInUser } from './use-get-backup-secret.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

async function reorderAndSignDeviceList(
  thisDeviceID: string,
  currentDeviceList: RawDeviceList,
): Promise<{
  +rawList: RawDeviceList,
  +signedList: SignedDeviceList,
}> {
  const currentDevices = [...currentDeviceList.devices];

  const thisDeviceIndex = currentDevices.indexOf(thisDeviceID);
  if (thisDeviceIndex < 0) {
    throw new Error("Device list doesn't contain current device ID");
  }

  const newDevices =
    thisDeviceIndex === 0
      ? currentDevices
      : [thisDeviceID, ...currentDevices.splice(thisDeviceIndex, 1)];

  const rawList = composeRawDeviceList(newDevices);
  const signedList = await signDeviceListUpdate(rawList);
  return { rawList, signedList };
}

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
  const userIdentifier = useSelector(state => state.currentUserInfo?.username);
  const dispatchActionPromise = useDispatchActionPromise();
  const { createUserKeysBackup, retrieveLatestBackupInfo, getBackupUserKeys } =
    useClientBackup();
  const getBackupSecret = useGetBackupSecretForLoggedInUser();
  const backupUploadInProgress = React.useRef<boolean>(false);
  const startingBackupHandlerInProgress = React.useRef<boolean>(false);
  const [handlerStarted, setHandlerStarted] = React.useState(false);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const dispatch = useDispatch();

  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const allPeerDevices = useSelector(getAllPeerDevices);

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

  const testUserKeysRestore = React.useCallback(async () => {
    if (!latestBackupInfo?.backupID) {
      return;
    }
    if (!userIdentifier) {
      throw new Error('Missing userIdentifier');
    }

    const retrievedBackupInfo = await retrieveLatestBackupInfo(userIdentifier);
    if (!retrievedBackupInfo) {
      throw new Error('latestBackupInfo not retrieved');
    }
    const { backupID } = retrievedBackupInfo;

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
    userIdentifier,
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
      const { getAuthMetadata, identityClient } = identityContext;
      const { userID, deviceID } = await getAuthMetadata();
      let currentDeviceList, currentUserPlatformDetails, deviceListIsSigned;
      try {
        if (!userID || !userIdentifier) {
          throw new Error('Missing userID or userIdentifier');
        }
        const deviceListsResponse = await identityClient.getDeviceListsForUsers(
          [userID],
        );
        currentDeviceList = deviceListsResponse.usersSignedDeviceLists[userID];
        currentUserPlatformDetails =
          deviceListsResponse.usersDevicesPlatformDetails[userID];
        if (!currentDeviceList || !currentUserPlatformDetails) {
          throw new Error('Device list not found for current user');
        }

        deviceListIsSigned = !!currentDeviceList.curPrimarySignature;
        if (!isPrimaryDevice && deviceListIsSigned) {
          backupUploadInProgress.current = false;
          return;
        }
      } catch (err) {
        const message = getMessageForException(err) ?? 'unknown error';
        showAlertToStaff('Error fetching current device list:', message);
        console.log('Error fetching current device list:', message);
        backupUploadInProgress.current = false;
        return;
      }

      if (isPrimaryDevice && latestBackupInfo) {
        const timestamp = latestBackupInfo.timestamp;
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

      const shouldDoMigration =
        usingRestoreFlow && !latestBackupInfo && !deviceListIsSigned;
      if (!shouldDoMigration && !isPrimaryDevice) {
        backupUploadInProgress.current = false;
        return;
      }
      try {
        const promise = (async () => {
          if (shouldDoMigration) {
            if (!userID || !deviceID) {
              throw new Error('Missing auth metadata');
            }

            const { updateDeviceList } = identityClient;
            invariant(
              updateDeviceList,
              'updateDeviceList() should be defined on native. ' +
                'Are you calling it on a non-primary device?',
            );

            // 1. upload UserKeys (without updating the store)
            let backupID = await createUserKeysBackup();

            // 2. create in-memory device list (reorder and sign)
            const newDeviceList = await reorderAndSignDeviceList(
              deviceID,
              rawDeviceListFromSignedList(currentDeviceList),
            );

            // 3. UpdateDeviceList RPC transaction
            await updateDeviceList(newDeviceList.signedList);
            dispatch({
              type: setPeerDeviceListsActionType,
              payload: {
                deviceLists: { [userID]: newDeviceList.rawList },
                usersPlatformDetails: {
                  [userID]: currentUserPlatformDetails,
                },
              },
            });

            // 4. Broadcast update to peers
            void getAndUpdateDeviceListsForUsers([userID]);
            void broadcastDeviceListUpdates(
              allPeerDevices.filter(id => id !== deviceID),
            );

            // 5. fetch backupID again and compare
            let retryCount = 0;
            let fetchedBackupInfo =
              await retrieveLatestBackupInfo(userIdentifier);

            while (fetchedBackupInfo?.backupID !== backupID) {
              retryCount++;
              if (retryCount >= 3) {
                throw new Error(`Backup ID mismatched ${retryCount} times`);
              }

              backupID = await createUserKeysBackup();
              fetchedBackupInfo =
                await retrieveLatestBackupInfo(userIdentifier);
            }

            // 6. Set store value (dispatchActionPromise success return value)
            return {
              backupID,
              timestamp: Date.now(),
            };
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
    allPeerDevices,
    broadcastDeviceListUpdates,
    canPerformBackupOperation,
    checkIfPrimaryDevice,
    createUserKeysBackup,
    dispatch,
    dispatchActionPromise,
    getAndUpdateDeviceListsForUsers,
    handlerStarted,
    identityContext,
    latestBackupInfo,
    retrieveLatestBackupInfo,
    showAlertToStaff,
    staffCanSee,
    testUserKeysRestore,
    userIdentifier,
  ]);

  return null;
}

export default BackupHandler;
