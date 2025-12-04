// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useGetDeviceListsForUsers } from './use-get-device-lists-for-users.js';
import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import {
  getAllPeerUserIDAndDeviceIDs,
  getPeersPrimaryDeviceIDs,
} from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { usePeerToPeerCommunication } from '../tunnelbroker/peer-to-peer-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { useResendPeerToPeerMessages } from '../tunnelbroker/use-resend-peer-to-peer-messages.js';
import type {
  RawDeviceList,
  SignedDeviceList,
  UserDevicesPlatformDetails,
  UsersRawDeviceLists,
} from '../types/identity-service-types.js';
import {
  type DeviceListUpdated,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  type AccountDeletionP2PMessage,
  userActionsP2PMessageTypes,
} from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { identityServiceQueryTimeout } from '../utils/identity-service.js';
import { values } from '../utils/objects.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';

export type PrimaryDeviceChange = {
  +userID: string,
  +prevPrimaryDeviceID: string,
  +newPrimaryDeviceID: string,
};

async function throwOnTimeout(userIDs: $ReadOnlyArray<string>) {
  await sleep(identityServiceQueryTimeout);
  throw new Error(`Device list fetch for ${JSON.stringify(userIDs)} timed out`);
}

function useGetAndUpdateDeviceListsForUsers(): (
  userIDs: $ReadOnlyArray<string>,
  broadcastUpdates: ?boolean,
  handlePrimaryDeviceChanges?: (
    changes: $ReadOnlyArray<PrimaryDeviceChange>,
  ) => Promise<void>,
) => Promise<?UsersRawDeviceLists> {
  const getDeviceListsForUsers = useGetDeviceListsForUsers();
  const dispatch = useDispatch();
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();

  const allPeerDevices = useSelector(getAllPeerUserIDAndDeviceIDs);
  const peerPrimaryDevices = useSelector(getPeersPrimaryDeviceIDs);

  return React.useCallback(
    async (
      userIDs: $ReadOnlyArray<string>,
      broadcastUpdates: ?boolean,
      handlePrimaryDeviceChanges,
    ) => {
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

      const primaryDeviceChanges: Array<PrimaryDeviceChange> = [];
      const allRemovedDevices: Array<string> = [];
      for (const userID of userIDs) {
        const peerDeviceList = result.deviceLists[userID]?.devices ?? [];

        // detect primary device changes
        const prevPrimaryDeviceID = peerPrimaryDevices[userID];
        const newPrimaryDeviceID = peerDeviceList[0];
        if (
          !!prevPrimaryDeviceID &&
          !!newPrimaryDeviceID &&
          newPrimaryDeviceID !== prevPrimaryDeviceID
        ) {
          primaryDeviceChanges.push({
            userID,
            prevPrimaryDeviceID,
            newPrimaryDeviceID,
          });
        }

        // detect removed devices
        const currentPeerDevicesSet = new Set(peerDeviceList);
        const peerRemovedDevices = allPeerDevices.filter(
          peer =>
            peer.userID === userID && !currentPeerDevicesSet.has(peer.deviceID),
        );
        allRemovedDevices.concat(...peerRemovedDevices);
      }

      if (primaryDeviceChanges.length > 0) {
        try {
          await handlePrimaryDeviceChanges?.(primaryDeviceChanges);
        } catch (err) {
          console.warn('Failed to handle primary device changes:', err);
        }
      }

      if (allRemovedDevices.length > 0) {
        try {
          const { sqliteAPI } = getConfig();
          const removalPromises = allRemovedDevices.map(deviceID =>
            sqliteAPI.removeAllOutboundP2PMessages(deviceID),
          );
          await Promise.all(removalPromises);
        } catch (err) {
          console.warn(
            'Failed to clear outbound P2P messages for removed devices:',
            err,
          );
        }
      }

      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists, usersPlatformDetails },
      });

      if (!broadcastUpdates) {
        return deviceLists;
      }

      const thisDeviceID = await getContentSigningKey();

      const allPeerDeviceIDs = new Set(
        allPeerDevices.map(peer => peer.deviceID),
      );
      const newDevices = values(deviceLists)
        .flatMap((deviceList: RawDeviceList) => deviceList.devices)
        .filter(
          deviceID =>
            !allPeerDeviceIDs.has(deviceID) && deviceID !== thisDeviceID,
        );

      await broadcastDeviceListUpdates(newDevices);

      return deviceLists;
    },
    [
      allPeerDevices,
      peerPrimaryDevices,
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
  +userID: string,
  +deviceID: string,
};
function useCurrentIdentityUserState(): () => Promise<CurrentIdentityUserState> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  return React.useCallback(async () => {
    const { userID, deviceID } = await getAuthMetadata();
    if (!userID || !deviceID) {
      throw new Error('Missing auth metadata');
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
      userID,
      deviceID,
    };
  }, [getAuthMetadata, identityClient]);
}

function useResetRatchetState(): (userID: ?string) => Promise<void> {
  const { createOlmSessionsWithUser } = usePeerOlmSessionsCreatorContext();
  const resendPeerToPeerMessages = useResendPeerToPeerMessages();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();

  return React.useCallback(
    async (userID: ?string) => {
      if (!userID) {
        return;
      }

      const deviceLists = await getAndUpdateDeviceListsForUsers([userID]);
      const deviceList = deviceLists?.[userID];
      const deviceIDs = deviceList?.devices;

      if (!deviceIDs) {
        return;
      }

      const sessionCreationPromises = deviceIDs.map(deviceID =>
        createOlmSessionsWithUser(
          userID,
          [
            {
              deviceID,
              sessionCreationOptions: { overwriteContentSession: true },
            },
          ],
          'session_reset',
        ),
      );

      await Promise.all(sessionCreationPromises);

      const messageResetPromises = deviceIDs.map(deviceID =>
        resendPeerToPeerMessages(deviceID),
      );
      await Promise.all(messageResetPromises);
    },
    [
      createOlmSessionsWithUser,
      getAndUpdateDeviceListsForUsers,
      resendPeerToPeerMessages,
    ],
  );
}

export {
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
  useBroadcastAccountDeletion,
  useCurrentIdentityUserState,
  useResetRatchetState,
};
