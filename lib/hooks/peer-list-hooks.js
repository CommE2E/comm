// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import {
  getAllPeerDevices,
  getForeignPeerDevices,
} from '../selectors/user-selectors.js';
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
  type EncryptedMessage,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  userActionsP2PMessageTypes,
  type AccountDeletionP2PMessage,
} from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
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
) => Promise<UsersRawDeviceLists> {
  const getDeviceListsForUsers = useGetDeviceListsForUsers();
  const dispatch = useDispatch();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();

  const allPeerDevices = useSelector(getAllPeerDevices);

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>, broadcastUpdates: ?boolean) => {
      const { deviceLists, usersPlatformDetails } =
        await getDeviceListsForUsers(userIDs);
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

function useBroadcastAccountDeletion(
  options: { broadcastToOwnDevices?: boolean } = {},
): () => Promise<void> {
  const { broadcastToOwnDevices } = options;

  const identityContext = React.useContext(IdentityClientContext);
  if (!identityContext) {
    throw new Error('Identity service client is not initialized');
  }
  const { sendMessageToDevice } = useTunnelbroker();

  const devicesSelector = broadcastToOwnDevices
    ? getAllPeerDevices
    : getForeignPeerDevices;
  const peerDevices = useSelector(devicesSelector);
  const { createOlmSessionsWithPeer } = usePeerOlmSessionsCreatorContext();

  return React.useCallback(async () => {
    const { getAuthMetadata } = identityContext;
    const authMetadata = await getAuthMetadata();
    const { userID, deviceID: thisDeviceID } = authMetadata;
    if (!thisDeviceID || !userID) {
      throw new Error('No auth metadata');
    }
    // create and send Olm Tunnelbroker messages to peers
    const { olmAPI } = getConfig();
    await olmAPI.initializeCryptoAccount();

    const deletionMessage: AccountDeletionP2PMessage = {
      type: userActionsP2PMessageTypes.ACCOUNT_DELETION,
    };
    const rawPayload = JSON.stringify(deletionMessage);

    const recipientDeviceIDs = peerDevices.filter(
      peerDeviceID => peerDeviceID !== thisDeviceID,
    );
    for (const deviceID of recipientDeviceIDs) {
      try {
        const encryptedData = await olmAPI.encrypt(rawPayload, deviceID);
        const encryptedMessage: EncryptedMessage = {
          type: peerToPeerMessageTypes.ENCRYPTED_MESSAGE,
          senderInfo: { deviceID: thisDeviceID, userID },
          encryptedData,
        };
        await sendMessageToDevice({
          deviceID,
          payload: JSON.stringify(encryptedMessage),
        });
      } catch {
        try {
          await createOlmSessionsWithPeer(userID, deviceID);
          const encryptedData = await olmAPI.encrypt(rawPayload, deviceID);
          const encryptedMessage: EncryptedMessage = {
            type: peerToPeerMessageTypes.ENCRYPTED_MESSAGE,
            senderInfo: { deviceID: thisDeviceID, userID },
            encryptedData,
          };
          await sendMessageToDevice({
            deviceID,
            payload: JSON.stringify(encryptedMessage),
          });
        } catch (err) {
          console.warn(
            `Error sending account deletion message to device ${deviceID}:`,
            err,
          );
        }
      }
    }
  }, [identityContext, peerDevices, sendMessageToDevice]);
}

export {
  useGetDeviceListsForUsers,
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
  useBroadcastAccountDeletion,
};
