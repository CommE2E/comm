// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import { getAllPeerDevices } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  UsersRawDeviceLists,
  UsersDevicesPlatformDetails,
  SignedDeviceList,
  RawDeviceList,
} from '../types/identity-service-types.js';
import {
  type DeviceListUpdated,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  getContentSigningKey,
  createOlmSessionWithPeer,
} from '../utils/crypto-utils.js';
import { convertSignedDeviceListsToRawDeviceLists } from '../utils/device-list-utils.js';
import { values } from '../utils/objects.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

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

function useGetAndUpdateDeviceListsForUsers(): (
  userIDs: $ReadOnlyArray<string>,
  broadcastUpdates: ?boolean,
) => Promise<void> {
  const getDeviceListsForUsers = useGetDeviceListsForUsers();
  const dispatch = useDispatch();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();

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

      if (!broadcastUpdates) {
        return;
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

export {
  useGetDeviceListsForUsers,
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
  useOlmSessionCreation,
};
