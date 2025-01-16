// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from 'lib/actions/aux-user-actions.js';
import {
  type CurrentIdentityUserState,
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
} from 'lib/hooks/peer-list-hooks.js';
import { getAllPeerDevices } from 'lib/selectors/user-selectors.js';
import { signDeviceListUpdate } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { type LocalLatestBackupInfo } from 'lib/types/backup-types.js';
import type {
  RawDeviceList,
  SignedDeviceList,
} from 'lib/types/identity-service-types.js';
import {
  composeRawDeviceList,
  rawDeviceListFromSignedList,
} from 'lib/utils/device-list-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { useClientBackup } from './use-client-backup.js';
import { useSelector } from '../redux/redux-utils.js';

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

function useMigrationToNewFlow(): (
  userID: ?string,
  deviceID: ?string,
  currentIdentityUserState: ?CurrentIdentityUserState,
) => Promise<LocalLatestBackupInfo> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient } = identityContext;

  const userIdentifier = useSelector(state => state.currentUserInfo?.username);
  const allPeerDevices = useSelector(getAllPeerDevices);

  const { retrieveLatestBackupInfo, createUserKeysBackup } = useClientBackup();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const dispatch = useDispatch();

  return React.useCallback(
    async (
      userID: ?string,
      deviceID: ?string,
      currentIdentityUserState: ?CurrentIdentityUserState,
    ): Promise<LocalLatestBackupInfo> => {
      if (!userID || !deviceID) {
        throw new Error('Missing auth metadata');
      }

      if (!currentIdentityUserState) {
        throw new Error('Missing currentIdentityUserState');
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
        rawDeviceListFromSignedList(currentIdentityUserState.currentDeviceList),
      );

      if (!userID || !userIdentifier) {
        throw new Error('Missing userID or userIdentifier');
      }
      // 3. UpdateDeviceList RPC transaction
      await updateDeviceList(newDeviceList.signedList);
      dispatch({
        type: setPeerDeviceListsActionType,
        payload: {
          deviceLists: { [userID]: newDeviceList.rawList },
          usersPlatformDetails: {
            [userID]: currentIdentityUserState.currentUserPlatformDetails,
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
      let fetchedBackupInfo = await retrieveLatestBackupInfo(userIdentifier);

      while (fetchedBackupInfo?.backupID !== backupID) {
        retryCount++;
        if (retryCount >= 3) {
          throw new Error(`Backup ID mismatched ${retryCount} times`);
        }

        backupID = await createUserKeysBackup();
        fetchedBackupInfo = await retrieveLatestBackupInfo(userIdentifier);
      }

      // 6. Set store value (dispatchActionPromise success return value)
      return {
        backupID,
        timestamp: Date.now(),
      };
    },
    [
      allPeerDevices,
      broadcastDeviceListUpdates,
      createUserKeysBackup,
      dispatch,
      getAndUpdateDeviceListsForUsers,
      identityClient,
      retrieveLatestBackupInfo,
      userIdentifier,
    ],
  );
}

export { useMigrationToNewFlow };
