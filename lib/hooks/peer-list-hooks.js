// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import {
  getAllPeerDevices,
  getAllPeerUserIDAndDeviceIDs,
} from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { usePeerToPeerCommunication } from '../tunnelbroker/peer-to-peer-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  UsersRawDeviceLists,
  UsersDevicesPlatformDetails,
  SignedDeviceList,
  RawDeviceList,
  UserDevicesPlatformDetails,
} from '../types/identity-service-types.js';
import {
  type DeviceListUpdated,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  userActionsP2PMessageTypes,
  type AccountDeletionP2PMessage,
} from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { convertSignedDeviceListsToRawDeviceLists } from '../utils/device-list-utils.js';
import { identityServiceQueryTimeout } from '../utils/identity-service.js';
import { values } from '../utils/objects.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';

function useGetDeviceListsForUsers(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<{
  +deviceLists: UsersRawDeviceLists,
  +usersPlatformDetails: UsersDevicesPlatformDetails,
}> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>) => {
      const peersDeviceLists =
        await identityClient.getDeviceListsForUsers(userIDs);
      return {
        deviceLists: convertSignedDeviceListsToRawDeviceLists(
          peersDeviceLists.usersSignedDeviceLists,
        ),
        usersPlatformDetails: peersDeviceLists.usersDevicesPlatformDetails,
      };
    },
    [identityClient],
  );
}

async function throwOnTimeout(userIDs: $ReadOnlyArray<string>) {
  await sleep(identityServiceQueryTimeout);
  throw new Error(`Device list fetch for ${JSON.stringify(userIDs)} timed out`);
}

function useGetAndUpdateDeviceListsForUsers(): (
  userIDs: $ReadOnlyArray<string>,
  broadcastUpdates: ?boolean,
) => Promise<?UsersRawDeviceLists> {
  const getDeviceListsForUsers = useGetDeviceListsForUsers();
  const dispatch = useDispatch();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();

  const allPeerDevices = useSelector(getAllPeerDevices);

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>, broadcastUpdates: ?boolean) => {
      const result = await Promise.race([
        getDeviceListsForUsers(userIDs),
        throwOnTimeout(userIDs),
      ]);
      if (!result) {
        return null;
      }

      const { deviceLists, usersPlatformDetails } = result;
      if (Object.keys(deviceLists).length === 0) {
        return {};
      }
      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists, usersPlatformDetails },
      });

      if (!broadcastUpdates) {
        return deviceLists;
      }

      const thisDeviceID = await getContentSigningKey();

      const newDevices = values(deviceLists)
        .map((deviceList: RawDeviceList) => deviceList.devices)
        .flat()
        .filter(
          deviceID =>
            !allPeerDevices.includes(deviceID) && deviceID !== thisDeviceID,
        );

      await broadcastDeviceListUpdates(newDevices);

      return deviceLists;
    },
    [
      allPeerDevices,
      broadcastDeviceListUpdates,
      dispatch,
      getDeviceListsForUsers,
    ],
  );
}

function useBroadcastDeviceListUpdates(): (
  deviceIDs: $ReadOnlyArray<string>,
  signedDeviceList?: SignedDeviceList,
) => Promise<void> {
  const { sendMessageToDevice } = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');

  return React.useCallback(
    async (
      deviceIDs: $ReadOnlyArray<string>,
      signedDeviceList?: SignedDeviceList,
    ) => {
      const { getAuthMetadata } = identityContext;

      const { userID } = await getAuthMetadata();
      if (!userID) {
        throw new Error('missing auth metadata');
      }
      const messageToPeer: DeviceListUpdated = {
        type: peerToPeerMessageTypes.DEVICE_LIST_UPDATED,
        userID,
        signedDeviceList,
      };
      const payload = JSON.stringify(messageToPeer);

      const promises = deviceIDs.map((deviceID: string) =>
        sendMessageToDevice({
          deviceID,
          payload,
        }),
      );
      await Promise.all(promises);
    },
    [identityContext, sendMessageToDevice],
  );
}

function useBroadcastAccountDeletion(options: {
  +includeOwnDevices: boolean,
}): () => Promise<void> {
  const { includeOwnDevices } = options;

  const identityContext = React.useContext(IdentityClientContext);
  if (!identityContext) {
    throw new Error('Identity service client is not initialized');
  }
  const { getAuthMetadata } = identityContext;

  const peers = useSelector(getAllPeerUserIDAndDeviceIDs);
  const { broadcastEphemeralMessage } = usePeerToPeerCommunication();

  return React.useCallback(async () => {
    const authMetadata = await getAuthMetadata();
    const { userID: thisUserID, deviceID: thisDeviceID } = authMetadata;
    if (!thisDeviceID || !thisUserID) {
      throw new Error('No auth metadata');
    }
    // create and send Olm Tunnelbroker messages to peers
    const { olmAPI } = getConfig();
    await olmAPI.initializeCryptoAccount();

    const deletionMessage: AccountDeletionP2PMessage = {
      type: userActionsP2PMessageTypes.ACCOUNT_DELETION,
    };
    const rawPayload = JSON.stringify(deletionMessage);

    const recipients = peers.filter(
      peer =>
        peer.deviceID !== thisDeviceID &&
        (includeOwnDevices || peer.userID !== thisUserID),
    );
    await broadcastEphemeralMessage(rawPayload, recipients, authMetadata);
  }, [broadcastEphemeralMessage, getAuthMetadata, includeOwnDevices, peers]);
}

export type CurrentIdentityUserState = {
  +currentDeviceList: SignedDeviceList,
  +currentUserPlatformDetails: UserDevicesPlatformDetails,
};
function useCurrentIdentityUserState(): () => Promise<CurrentIdentityUserState> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  return React.useCallback(async () => {
    const { userID } = await getAuthMetadata();
    if (!userID) {
      throw new Error('Missing userID');
    }

    const { getDeviceListsForUsers } = identityClient;
    const deviceListsResponse = await getDeviceListsForUsers([userID]);
    const currentDeviceList =
      deviceListsResponse.usersSignedDeviceLists[userID];
    const currentUserPlatformDetails =
      deviceListsResponse.usersDevicesPlatformDetails[userID];
    if (!currentDeviceList || !currentUserPlatformDetails) {
      throw new Error('Device list not found for current user');
    }
    return {
      currentDeviceList,
      currentUserPlatformDetails,
    };
  }, [getAuthMetadata, identityClient]);
}

export {
  useGetDeviceListsForUsers,
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
  useBroadcastAccountDeletion,
  useCurrentIdentityUserState,
};
