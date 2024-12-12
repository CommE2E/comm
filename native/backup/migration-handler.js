// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from 'lib/actions/aux-user-actions.js';
import { createUserKeysBackupActionTypes } from 'lib/actions/backup-actions.js';
import { useBroadcastDeviceListUpdates } from 'lib/hooks/peer-list-hooks.js';
import { isLoggedIn, getAllPeerDevices } from 'lib/selectors/user-selectors.js';
import { signDeviceListUpdate } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type {
  RawDeviceList,
  SignedDeviceList,
} from 'lib/types/identity-service-types.js';
import { composeRawDeviceList } from 'lib/utils/device-list-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingRestoreFlow } from 'lib/utils/services-utils.js';

import { useClientBackup } from './use-client-backup.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

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

function SignedDeviceListMigrationHandler(): null {
  const loggedIn = useSelector(isLoggedIn);
  const staffCanSee = useStaffCanSee();
  const isBackground = useSelector(
    state => state.lifecycleState === 'background',
  );
  const latestBackupInfo = useSelector(
    state => state.backupStore.latestBackupInfo,
  );
  const shouldPerformMigration =
    loggedIn &&
    !isBackground &&
    staffCanSee &&
    usingRestoreFlow &&
    !latestBackupInfo;

  const migrationRunning = React.useRef(false);

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const selfAuxUserInfo = useSelector(state =>
    currentUserInfo?.id
      ? state.auxUserStore.auxUserInfos[currentUserInfo.id]
      : null,
  );

  const { createUserKeysBackup, retrieveLatestBackupInfo } = useClientBackup();
  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();

  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const allPeerDevices = useSelector(getAllPeerDevices);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  React.useEffect(() => {
    if (!shouldPerformMigration || !selfAuxUserInfo) {
      return;
    }
    const currentDeviceList = selfAuxUserInfo.deviceList;
    if (!currentDeviceList) {
      return;
    }

    if (!currentUserInfo?.username) {
      throw new Error('Missing userIdentifier');
    }

    const { identityClient, getAuthMetadata } = identityContext;
    const { updateDeviceList } = identityClient;
    invariant(
      updateDeviceList,
      'updateDeviceList() should be defined on native. ' +
        'Are you calling it on a non-primary device?',
    );

    if (migrationRunning.current) {
      return;
    }
    migrationRunning.current = true;
    const migrationPromise = (async () => {
      try {
        const { userID, deviceID } = await getAuthMetadata();
        if (!userID || !deviceID) {
          throw new Error('Missing auth metadata');
        }

        // 1. upload UserKeys (without updating the store)
        const backupID = await createUserKeysBackup();

        // 2. create in-memory device list (reorder and sign)
        const newDeviceList = await reorderAndSignDeviceList(
          deviceID,
          currentDeviceList,
        );

        // 3. UpdateDeviceList RPC transaction
        await updateDeviceList(newDeviceList.signedList);

        // 4. fetch backupID again and compare
        const fetchedBackupInfo = await retrieveLatestBackupInfo(
          currentUserInfo.username,
        );
        if (!fetchedBackupInfo.backupID !== backupID) {
          // TODO: - if not equal, upload backup keys again
          throw new Error('BackupID doesnt match');
        }

        // 5a. Update self device list
        if (!userID) {
          // flow - says userID can be void even despite above check
          throw new Error('Missing auth metadata');
        }
        dispatch({
          type: setPeerDeviceListsActionType,
          payload: {
            deviceLists: { [userID]: newDeviceList.rawList },
            usersPlatformDetails: {
              [userID]: selfAuxUserInfo.devicesPlatformDetails,
            },
          },
        });
        // 5b. Broadcast update to peers
        void broadcastDeviceListUpdates(
          allPeerDevices.filter(id => id !== deviceID),
        );

        // 6. Set store value (dispatchActionPromise success return value)
        return {
          backupID,
          timestamp: Date.now(),
        };
      } finally {
        migrationRunning.current = false;
      }
    })();

    void dispatchActionPromise(
      createUserKeysBackupActionTypes,
      migrationPromise,
    );
  }, [
    shouldPerformMigration,
    allPeerDevices,
    broadcastDeviceListUpdates,
    identityContext,
    dispatch,
    dispatchActionPromise,
    currentUserInfo,
    createUserKeysBackup,
    retrieveLatestBackupInfo,
    selfAuxUserInfo,
  ]);

  return null;
}

export default SignedDeviceListMigrationHandler;
