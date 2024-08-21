// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';

import { useResendPeerToPeerMessages } from './use-resend-peer-to-peer-messages.js';
import { removePeerUsersActionType } from '../actions/aux-user-actions.js';
import { invalidateTunnelbrokerDeviceTokenActionType } from '../actions/tunnelbroker-actions.js';
import { logOutActionTypes, useLogOut } from '../actions/user-actions.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import {
  useBroadcastDeviceListUpdates,
  useBroadcastAccountDeletion,
  useGetAndUpdateDeviceListsForUsers,
} from '../hooks/peer-list-hooks.js';
import {
  getAllPeerDevices,
  getForeignPeerDevices,
} from '../selectors/user-selectors.js';
import {
  verifyAndGetDeviceList,
  removeDeviceFromDeviceList,
} from '../shared/device-list-utils.js';
import { useProcessDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { DeviceOlmInboundKeys } from '../types/identity-service-types.js';
import {
  peerToPeerMessageTypes,
  type PeerToPeerMessage,
  type SenderInfo,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  userActionsP2PMessageTypes,
  userActionP2PMessageValidator,
  type UserActionP2PMessage,
} from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import {
  hasHigherDeviceID,
  OLM_SESSION_ERROR_PREFIX,
  olmSessionErrors,
} from '../utils/olm-utils.js';
import { getClientMessageIDFromTunnelbrokerMessageID } from '../utils/peer-to-peer-communication-utils.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

// When logout is requested by primary device, logging out of Identity Service
// is already handled by the primary device
const primaryRequestLogoutOptions = Object.freeze({ skipIdentityLogOut: true });

// When re-broadcasting, we want to do it only to foreign peers
// to avoid a vicious circle of deletion messages sent by own devices.
const accountDeletionBroadcastOptions = Object.freeze({
  includeOwnDevices: false,
});

// handles `peerToPeerMessageTypes.ENCRYPTED_MESSAGE`
function useHandleOlmMessageToDevice() {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const { identityClient, getAuthMetadata } = identityContext;
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const reBroadcastAccountDeletion = useBroadcastAccountDeletion(
    accountDeletionBroadcastOptions,
  );
  const allPeerDevices = useSelector(getAllPeerDevices);

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const primaryDeviceRequestedLogOut = useLogOut(primaryRequestLogoutOptions);

  const processDMOperation = useProcessDMOperation();

  return React.useCallback(
    async (
      decryptedMessageContent: string,
      senderInfo: SenderInfo,
      messageID: string,
    ) => {
      const parsedMessageToDevice = JSON.parse(decryptedMessageContent);

      // Handle user-action messages
      if (!userActionP2PMessageValidator.is(parsedMessageToDevice)) {
        return;
      }
      const userActionMessage: UserActionP2PMessage = parsedMessageToDevice;

      if (
        userActionMessage.type ===
        userActionsP2PMessageTypes.LOG_OUT_PRIMARY_DEVICE
      ) {
        void dispatchActionPromise(
          logOutActionTypes,
          primaryDeviceRequestedLogOut(),
        );
      } else if (
        userActionMessage.type ===
        userActionsP2PMessageTypes.LOG_OUT_SECONDARY_DEVICE
      ) {
        const { userID, deviceID: deviceIDToLogOut } = senderInfo;
        await removeDeviceFromDeviceList(
          identityClient,
          userID,
          deviceIDToLogOut,
        );
        await broadcastDeviceListUpdates(
          allPeerDevices.filter(deviceID => deviceID !== deviceIDToLogOut),
        );
      } else if (
        userActionMessage.type === userActionsP2PMessageTypes.DM_OPERATION
      ) {
        await processDMOperation(userActionMessage.op, {
          messageID,
          senderDeviceID: senderInfo.deviceID,
        });
      } else if (
        userActionMessage.type === userActionsP2PMessageTypes.ACCOUNT_DELETION
      ) {
        const { userID: thisUserID } = await getAuthMetadata();
        if (!thisUserID) {
          return;
        }
        // own devices re-broadcast account deletion to foreign peer devices
        if (senderInfo.userID === thisUserID) {
          await reBroadcastAccountDeletion();
          // we treat account deletion the same way as primary-device-requested
          // logout
          void dispatchActionPromise(
            logOutActionTypes,
            primaryDeviceRequestedLogOut(),
          );
        } else {
          dispatch({
            type: removePeerUsersActionType,
            payload: { userIDs: [senderInfo.userID] },
          });
        }
      } else {
        console.warn(
          'Unsupported P2P user action message:',
          userActionMessage.type,
        );
      }
    },
    [
      allPeerDevices,
      broadcastDeviceListUpdates,
      dispatch,
      dispatchActionPromise,
      getAuthMetadata,
      identityClient,
      primaryDeviceRequestedLogOut,
      processDMOperation,
      reBroadcastAccountDeletion,
    ],
  );
}

function usePeerToPeerMessageHandler(): (
  message: PeerToPeerMessage,
  messageID: string,
) => Promise<void> {
  const { olmAPI, sqliteAPI } = getConfig();

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient, getAuthMetadata } = identityContext;

  const foreignPeerDevices = useSelector(getForeignPeerDevices);
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();

  const dispatch = useDispatch();

  const handleOlmMessageToDevice = useHandleOlmMessageToDevice();
  const resendPeerToPeerMessages = useResendPeerToPeerMessages();
  const { createOlmSessionsWithPeer } = usePeerOlmSessionsCreatorContext();

  return React.useCallback(
    async (message: PeerToPeerMessage, messageID: string) => {
      if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
        const { senderInfo, encryptedData, sessionVersion } = message;
        const { userID: senderUserID, deviceID: senderDeviceID } = senderInfo;

        let deviceKeys: ?DeviceOlmInboundKeys = null;
        try {
          const { keys } =
            await identityClient.getInboundKeysForUser(senderUserID);
          deviceKeys = keys[senderDeviceID];
        } catch (e) {
          console.log(e.message);
        }

        if (!deviceKeys) {
          console.log(
            'Error creating inbound session with device ' +
              `${senderDeviceID}: No keys for the device, ` +
              `session version: ${sessionVersion}`,
          );
          return;
        }

        try {
          await olmAPI.initializeCryptoAccount();
          const result = await olmAPI.contentInboundSessionCreator(
            deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
            encryptedData,
            sessionVersion,
            false,
          );
          console.log(
            'Created inbound session with device ' +
              `${senderDeviceID}: ${result}, ` +
              `session version: ${sessionVersion}`,
          );
        } catch (e) {
          if (e.message?.includes(olmSessionErrors.alreadyCreated)) {
            console.log(
              'Received session request with lower session version from ' +
                `${senderDeviceID}, session version: ${sessionVersion}`,
            );
          } else if (e.message?.includes(olmSessionErrors.raceCondition)) {
            const currentDeviceID = await getContentSigningKey();
            if (hasHigherDeviceID(currentDeviceID, senderDeviceID)) {
              console.log(
                'Race condition while creating session with ' +
                  `${senderDeviceID}, session version: ${sessionVersion}, ` +
                  `this device has a higher deviceID and the session will be kept`,
              );
            } else {
              const result = await olmAPI.contentInboundSessionCreator(
                deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
                encryptedData,
                sessionVersion,
                true,
              );
              console.log(
                'Overwrite session with device ' +
                  `${senderDeviceID}: ${result}, ` +
                  `session version: ${sessionVersion}`,
              );
              await resendPeerToPeerMessages(senderDeviceID);
            }
          } else {
            console.log(
              'Error creating inbound session with device ' +
                `${senderDeviceID}: ${e.message}, ` +
                `session version: ${sessionVersion}`,
            );
          }
        }
      } else if (message.type === peerToPeerMessageTypes.ENCRYPTED_MESSAGE) {
        try {
          await olmAPI.initializeCryptoAccount();
          const decrypted = await olmAPI.decryptAndPersist(
            message.encryptedData,
            message.senderInfo.deviceID,
            messageID,
          );
          console.log(
            'Decrypted message from device ' +
              `${message.senderInfo.deviceID}: ${decrypted}`,
          );

          try {
            await handleOlmMessageToDevice(
              decrypted,
              message.senderInfo,
              messageID,
            );
          } catch (e) {
            console.log('Failed processing Olm P2P message:', e);
          }
        } catch (e) {
          if (e.message?.includes(olmSessionErrors.invalidSessionVersion)) {
            console.log(
              'Received message decrypted with different session from ' +
                `${message.senderInfo.deviceID}.`,
            );
            return;
          }
          console.log(
            'Error decrypting message from device ' +
              `${message.senderInfo.deviceID}: ${e.message}`,
          );

          if (!e.message?.includes(OLM_SESSION_ERROR_PREFIX)) {
            throw e;
          }

          await createOlmSessionsWithPeer(
            message.senderInfo.userID,
            message.senderInfo.deviceID,
            {
              overwriteContentSession: true,
            },
          );
          await resendPeerToPeerMessages(message.senderInfo.deviceID);
        }
      } else if (message.type === peerToPeerMessageTypes.REFRESH_KEY_REQUEST) {
        try {
          await olmAPI.initializeCryptoAccount();
          const oneTimeKeys = await olmAPI.getOneTimeKeys(message.numberOfKeys);
          await identityClient.uploadOneTimeKeys(oneTimeKeys);
        } catch (e) {
          console.log(`Error uploading one-time keys: ${e.message}`);
        }
      } else if (message.type === peerToPeerMessageTypes.DEVICE_LIST_UPDATED) {
        try {
          const result = await verifyAndGetDeviceList(
            identityClient,
            message.userID,
            null,
          );
          if (!result.valid) {
            console.log(
              `Received invalid device list update for user ${message.userID}. Reason: ${result.reason}`,
            );
          } else {
            console.log(
              `Received valid device list update for user ${message.userID}`,
            );
          }
          await getAndUpdateDeviceListsForUsers([message.userID]);

          if (result.valid && message?.signedDeviceList?.rawDeviceList) {
            const receivedRawList = JSON.parse(
              message.signedDeviceList.rawDeviceList,
            );

            // additional check for broadcasted and Identity device
            // list equality
            const listsAreEqual = _isEqual(result.deviceList)(receivedRawList);
            console.log(
              `Identity and received device lists are ${
                listsAreEqual ? '' : 'not'
              } equal.`,
            );
          }
        } catch (e) {
          console.log(
            `Error verifying device list for user ${message.userID}: ${e}`,
          );
        }
      } else if (
        message.type === peerToPeerMessageTypes.IDENTITY_DEVICE_LIST_UPDATED
      ) {
        try {
          const { userID } = await getAuthMetadata();
          if (!userID) {
            return;
          }

          await Promise.all([
            broadcastDeviceListUpdates(foreignPeerDevices),
            getAndUpdateDeviceListsForUsers([userID]),
          ]);
        } catch (e) {
          console.log(
            `Error updating device list after Identity request: ${
              getMessageForException(e) ?? 'unknown error'
            }`,
          );
        }
      } else if (message.type === peerToPeerMessageTypes.MESSAGE_PROCESSED) {
        try {
          const { deviceID, messageID: tunnelbrokerMessageID } = message;
          const clientMessageID = getClientMessageIDFromTunnelbrokerMessageID(
            tunnelbrokerMessageID,
          );
          await sqliteAPI.removeOutboundP2PMessagesOlderThan(
            clientMessageID,
            deviceID,
          );
        } catch (e) {
          console.log(
            `Error removing message after processing: ${
              getMessageForException(e) ?? 'unknown error'
            }`,
          );
        }
      } else if (message.type === peerToPeerMessageTypes.BAD_DEVICE_TOKEN) {
        dispatch({
          type: invalidateTunnelbrokerDeviceTokenActionType,
          payload: {
            deviceToken: message.invalidatedToken,
          },
        });
      }
    },
    [
      broadcastDeviceListUpdates,
      createOlmSessionsWithPeer,
      dispatch,
      foreignPeerDevices,
      getAndUpdateDeviceListsForUsers,
      getAuthMetadata,
      handleOlmMessageToDevice,
      identityClient,
      olmAPI,
      resendPeerToPeerMessages,
      sqliteAPI,
    ],
  );
}

export { usePeerToPeerMessageHandler };
