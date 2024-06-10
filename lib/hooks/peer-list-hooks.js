// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import {
  getAllPeerDevices,
  getRelativeUserIDs,
} from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  UsersRawDeviceLists,
  UsersDevicesPlatformDetails,
  SignedDeviceList,
} from '../types/identity-service-types.js';
import {
  type DeviceListUpdated,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  createOlmSessionWithPeer,
  getContentSigningKey,
} from '../utils/crypto-utils.js';
import { convertSignedDeviceListsToRawDeviceLists } from '../utils/device-list-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function useCreateInitialPeerList(): () => Promise<void> {
  const dispatch = useDispatch();
  const relativeUserIDs = useSelector(getRelativeUserIDs);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  return React.useCallback(async () => {
    if (!identityContext) {
      return;
    }
    try {
      const peersDeviceLists =
        await identityContext.identityClient.getDeviceListsForUsers(
          relativeUserIDs,
        );
      const usersRawDeviceLists = convertSignedDeviceListsToRawDeviceLists(
        peersDeviceLists.usersSignedDeviceLists,
      );
      const usersPlatformDetails = peersDeviceLists.usersDevicesPlatformDetails;

      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists: usersRawDeviceLists, usersPlatformDetails },
      });
    } catch (e) {
      console.log(`Error creating initial peer list: ${e.message}`);
    }
  }, [dispatch, identityContext, relativeUserIDs]);
}

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

function useOlmSessionCreation(): (
  userID: string,
  deviceID: string,
) => Promise<void> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata, identityClient } = identityContext;

  const { sendMessage } = useTunnelbroker();

  return React.useCallback(
    async (userID: string, deviceID: string) => {
      const authMetadata = await getAuthMetadata();
      return createOlmSessionWithPeer(
        authMetadata,
        identityClient,
        sendMessage,
        userID,
        deviceID,
      );
    },
    [getAuthMetadata, identityClient, sendMessage],
  );
}

function useGetAndUpdateDeviceListsForUsers(): (
  userIDs: $ReadOnlyArray<string>,
  broadcastUpdates: ?boolean,
) => Promise<void> {
  const getDeviceListsForUsers = useGetDeviceListsForUsers();
  const dispatch = useDispatch();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const olmSessionCreation = useOlmSessionCreation();

  const allPeerDevices = useSelector(getAllPeerDevices);

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>, broadcastUpdates: ?boolean) => {
      const { deviceLists, usersPlatformDetails } =
        await getDeviceListsForUsers(userIDs);
      if (Object.keys(deviceLists).length === 0) {
        return;
      }
      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists, usersPlatformDetails },
      });

      const ownDeviceID = await getContentSigningKey();

      const newPeers: { +deviceID: string, +userID: string }[] = [];

      for (const userID in deviceLists) {
        deviceLists[userID].devices.forEach(deviceID =>
          newPeers.push({ userID, deviceID }),
        );
      }

      const promises = newPeers.map(async data => {
        try {
          await olmSessionCreation(data.userID, data.deviceID);
        } catch (e) {
          console.log(
            'Error creating olm session with ' +
              `device ${data.deviceID}: ${e.message}`,
          );
        }
      });

      if (broadcastUpdates) {
        const newDevices = newPeers
          .map(data => data.deviceID)
          .filter(
            deviceID =>
              !allPeerDevices.includes(deviceID) && deviceID !== ownDeviceID,
          );
        promises.push(broadcastDeviceListUpdates(newDevices));
      }

      await Promise.all(promises);
    },
    [
      allPeerDevices,
      broadcastDeviceListUpdates,
      dispatch,
      getDeviceListsForUsers,
      olmSessionCreation,
    ],
  );
}

function useBroadcastDeviceListUpdates(): (
  deviceIDs: $ReadOnlyArray<string>,
  signedDeviceList?: SignedDeviceList,
) => Promise<void> {
  const { sendMessage } = useTunnelbroker();
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
        sendMessage({
          deviceID,
          payload,
        }),
      );
      await Promise.all(promises);
    },
    [identityContext, sendMessage],
  );
}

export {
  useCreateInitialPeerList,
  useGetDeviceListsForUsers,
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
};
