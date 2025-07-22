// @flow

import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import uuid from 'uuid';

import { useResendPeerToPeerMessages } from './use-resend-peer-to-peer-messages.js';
import { removePeerUsersActionType } from '../actions/aux-user-actions.js';
import { invalidateTunnelbrokerDeviceTokenActionType } from '../actions/tunnelbroker-actions.js';
import { logOutActionTypes, useBaseLogOut } from '../actions/user-actions.js';
import { useUserDataRestoreContext } from '../backup/user-data-restore-context.js';
import {
  logTypes,
  type OlmDebugLog,
  useDebugLogs,
  useOlmDebugLogs,
} from '../components/debug-logs-context.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import {
  useBroadcastDeviceListUpdates,
  useBroadcastAccountDeletion,
  useGetAndUpdateDeviceListsForUsers,
} from '../hooks/peer-list-hooks.js';
import { getForeignPeerDeviceIDs } from '../selectors/user-selectors.js';
import {
  verifyAndGetDeviceList,
  useDeviceListUpdate,
} from '../shared/device-list-utils.js';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-types.js';
import { useProcessDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type {
  IdentityServiceClient,
  DeviceOlmInboundKeys,
} from '../types/identity-service-types';
import {
  peerToPeerMessageTypes,
  type PeerToPeerMessage,
  type SenderInfo,
  type RefreshKeyRequest,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  userActionsP2PMessageTypes,
  userActionP2PMessageValidator,
  type UserActionP2PMessage,
} from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import type { AccountDeletionUpdateInfo } from '../types/update-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import {
  hasHigherDeviceID,
  OLM_ERROR_FLAG,
  olmSessionErrors,
} from '../utils/olm-utils.js';
import { getClientMessageIDFromTunnelbrokerMessageID } from '../utils/peer-to-peer-communication-utils.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';
import { fullBackupSupport } from '../utils/services-utils.js';

// When logout is requested by primary device, logging out of Identity Service
// is already handled by the primary device
const primaryRequestLogoutOptions = Object.freeze({
  logOutType: 'secondary_device',
  skipIdentityLogOut: true,
});

// When re-broadcasting, we want to do it only to foreign peers
// to avoid a vicious circle of deletion messages sent by own devices.
const accountDeletionBroadcastOptions = Object.freeze({
  includeOwnDevices: false,
});

// handles `peerToPeerMessageTypes.ENCRYPTED_MESSAGE`
function useHandleOlmMessageToDevice(): (
  decryptedMessageContent: string,
  senderInfo: SenderInfo,
  messageID: string,
) => Promise<void> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const { getAuthMetadata } = identityContext;
  const reBroadcastAccountDeletion = useBroadcastAccountDeletion(
    accountDeletionBroadcastOptions,
  );

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const primaryDeviceRequestedLogOut = useBaseLogOut(
    primaryRequestLogoutOptions,
  );
  const runDeviceListUpdate = useDeviceListUpdate();

  const processDMOperation = useProcessDMOperation();
  const { userDataRestore } = useUserDataRestoreContext();
  const restoreBackupState = useSelector(state => state.restoreBackupState);

  return React.useCallback(
    async (
      decryptedMessageContent: string,
      senderInfo: SenderInfo,
      messageID: string,
    ) => {
      const { sqliteAPI } = getConfig();

      const parsedMessageToDevice = JSON.parse(decryptedMessageContent);

      // Handle user-action messages
      if (!userActionP2PMessageValidator.is(parsedMessageToDevice)) {
        return;
      }
      const userActionMessage: UserActionP2PMessage = parsedMessageToDevice;

      if (
        userActionMessage.type === userActionsP2PMessageTypes.LOG_OUT_DEVICE
      ) {
        // causes log out, there is no need to remove Inbound P2P message
        void dispatchActionPromise(
          logOutActionTypes,
          primaryDeviceRequestedLogOut(),
        );
      } else if (
        userActionMessage.type ===
        userActionsP2PMessageTypes.LOG_OUT_SECONDARY_DEVICE
      ) {
        const { deviceID: deviceIDToLogOut } = senderInfo;
        await runDeviceListUpdate({
          type: 'remove',
          deviceID: deviceIDToLogOut,
        });
        await sqliteAPI.removeInboundP2PMessages([messageID]);
      } else if (
        userActionMessage.type === userActionsP2PMessageTypes.DM_OPERATION
      ) {
        // inbound P2P message is removed in DBOpsHandler after processing
        await processDMOperation({
          type: dmOperationSpecificationTypes.INBOUND,
          op: userActionMessage.op,
          metadata: {
            messageID,
            senderDeviceID: senderInfo.deviceID,
          },
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
          // logout, no need to remove Inbound P2P message
          void dispatchActionPromise(
            logOutActionTypes,
            primaryDeviceRequestedLogOut(),
          );
        } else {
          const deleteUserUpdate: AccountDeletionUpdateInfo = {
            time: Date.now(),
            id: uuid.v4(),
            deletedUserID: senderInfo.userID,
            type: updateTypes.DELETE_ACCOUNT,
          };
          dispatch({
            type: removePeerUsersActionType,
            payload: { updatesResult: { newUpdates: [deleteUserUpdate] } },
          });
          await sqliteAPI.removeInboundP2PMessages([messageID]);
        }
      } else if (
        userActionMessage.type === userActionsP2PMessageTypes.BACKUP_DATA
      ) {
        if (!fullBackupSupport) {
          console.warn(
            'Received backup data but this device is not supporting UserData backup',
          );
          return;
        }

        if (restoreBackupState.status !== 'no_backup') {
          console.warn(
            'Received backup data but backup action was already dispatched',
          );
          await sqliteAPI.removeInboundP2PMessages([messageID]);
          return;
        }

        const { userID, backupData } = userActionMessage;
        const { userID: currentUserID, accessToken } = await getAuthMetadata();

        if (userID !== currentUserID) {
          console.warn('Received backup data from wrong user');
          await sqliteAPI.removeInboundP2PMessages([messageID]);
          return;
        }

        if (!accessToken) {
          return;
        }

        await userDataRestore(false, userID, accessToken, backupData);

        await sqliteAPI.removeInboundP2PMessages([messageID]);
      } else {
        console.warn(
          'Unsupported P2P user action message:',
          userActionMessage.type,
        );
      }
    },
    [
      dispatch,
      dispatchActionPromise,
      getAuthMetadata,
      primaryDeviceRequestedLogOut,
      processDMOperation,
      reBroadcastAccountDeletion,
      restoreBackupState.status,
      runDeviceListUpdate,
      userDataRestore,
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

  const foreignPeerDevices = useSelector(getForeignPeerDeviceIDs);
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();

  const dispatch = useDispatch();

  const handleOlmMessageToDevice = useHandleOlmMessageToDevice();
  const resendPeerToPeerMessages = useResendPeerToPeerMessages();
  const { createOlmSessionsWithUser } = usePeerOlmSessionsCreatorContext();

  const { addLog } = useDebugLogs();
  const olmDebugLog = useOlmDebugLogs();

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
          console.log(getMessageForException(e));
        }

        if (!deviceKeys) {
          addLog(
            'Error creating inbound session with device',
            `${senderDeviceID}: No keys for the device, ` +
              `session version: ${sessionVersion}`,
            new Set([logTypes.ERROR, logTypes.OLM]),
          );
          return;
        }

        let resultDescription = 'starting',
          success = false;
        try {
          await olmAPI.initializeCryptoAccount();
          const result = await olmAPI.contentInboundSessionCreator(
            deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
            encryptedData,
            sessionVersion,
            false,
          );
          success = true;

          resultDescription = 'resending messages to peers';
          await resendPeerToPeerMessages(senderDeviceID);

          resultDescription =
            'Created inbound session with device ' +
            `${senderDeviceID}: ${result}, ` +
            `session version: ${sessionVersion}`;
        } catch (e) {
          const errorMessage = getMessageForException(e) ?? '';
          if (errorMessage.includes(olmSessionErrors.alreadyCreated)) {
            resultDescription =
              'Received session request with lower session version from ' +
              `${senderDeviceID}, session version: ${sessionVersion}`;
          } else if (errorMessage.includes(olmSessionErrors.raceCondition)) {
            const currentDeviceID = await getContentSigningKey();
            if (hasHigherDeviceID(currentDeviceID, senderDeviceID)) {
              resultDescription =
                'Race condition while creating session with ' +
                `${senderDeviceID}, session version: ${sessionVersion}, ` +
                'this device has a higher deviceID and the session will be ' +
                'kept';
            } else {
              resultDescription =
                'Race condition while creating session with ' +
                `${senderDeviceID}, session version: ${sessionVersion}, ` +
                'this device has a lower deviceID and the session will be ' +
                'overwritten';

              let result;
              try {
                result = await olmAPI.contentInboundSessionCreator(
                  deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
                  encryptedData,
                  sessionVersion,
                  true,
                );
              } catch (e2) {
                const error2Message = getMessageForException(e2) ?? '';
                resultDescription =
                  'Race condition while creating session with ' +
                  `${senderDeviceID}, session version: ${sessionVersion}, ` +
                  'this device has a lower deviceID but overriding the' +
                  ` session failed ${error2Message}`;
                throw e2;
              }

              resultDescription =
                'Overwrite session with device ' +
                `${senderDeviceID}: ${result}, ` +
                `session version: ${sessionVersion}, starting resending ` +
                'messages';

              try {
                await resendPeerToPeerMessages(senderDeviceID);
              } catch (e2) {
                const error2Message = getMessageForException(e2) ?? '';
                resultDescription =
                  'Race condition while creating session with ' +
                  `${senderDeviceID}, session version: ${sessionVersion}, ` +
                  'this device has a lower deviceID but resending the' +
                  ` messages failed ${error2Message}`;
                throw e2;
              }

              resultDescription =
                'Overwrite session with device ' +
                `${senderDeviceID}: ${result}, ` +
                `session version: ${sessionVersion}, finished resending ` +
                'messages';
            }
          } else {
            resultDescription =
              'Error creating inbound session with device ' +
              `${senderDeviceID}: ${errorMessage}, ` +
              `session version: ${sessionVersion}`;
          }
        } finally {
          olmDebugLog({
            operation: 'contentInboundSessionCreator',
            peer: message.senderInfo,
            encryptedData: {
              messageType: message.encryptedData.messageType,
              sessionVersion: message.sessionVersion,
            },
            success,
            resultDescription,
          });
        }
      } else if (message.type === peerToPeerMessageTypes.ENCRYPTED_MESSAGE) {
        let resultDescription = 'starting',
          success = false,
          decryptedData = { type: 'unknown' };
        try {
          await olmAPI.initializeCryptoAccount();
          const decrypted = await olmAPI.decryptAndPersist(
            message.encryptedData,
            message.senderInfo.deviceID,
            message.senderInfo.userID,
            messageID,
          );
          resultDescription = `Decrypted message from device ${message.senderInfo.deviceID}`;
          success = true;

          try {
            const parsedMessageToDevice = JSON.parse(decrypted);
            if (
              parsedMessageToDevice?.type ===
              userActionsP2PMessageTypes.DM_OPERATION
            ) {
              decryptedData = {
                type: parsedMessageToDevice?.type,
                dmOpData: {
                  type: parsedMessageToDevice?.op?.type,
                  messageID: parsedMessageToDevice?.op?.messageID,
                  targetMessageID: parsedMessageToDevice?.op?.targetMessageID,
                  sourceMessageID: parsedMessageToDevice?.op?.sourceMessageID,
                },
              };
            } else {
              decryptedData = {
                type: parsedMessageToDevice?.type,
              };
            }
          } catch (e) {
            decryptedData = {
              type: 'error_parsing',
            };
          }

          try {
            await handleOlmMessageToDevice(
              decrypted,
              message.senderInfo,
              messageID,
            );
          } catch (e) {
            resultDescription =
              `Failed processing Olm P2P message ${messageID}:` +
              `${getMessageForException(e) ?? 'unknown error'}`;
            console.log(resultDescription);
          }
        } catch (e) {
          const errorMessage = getMessageForException(e) ?? '';
          if (errorMessage.includes(olmSessionErrors.invalidSessionVersion)) {
            resultDescription =
              'Received message decrypted with different session from ' +
              `${message.senderInfo.deviceID}.`;
            return;
          }

          if (errorMessage.includes(olmSessionErrors.alreadyDecrypted)) {
            const sqliteMessages = await sqliteAPI.getInboundP2PMessagesByID([
              messageID,
            ]);
            if (sqliteMessages.length > 0) {
              resultDescription =
                'Message skipped because it was already decrypted ' +
                `messageID: ${messageID} ` +
                `sender: ${message.senderInfo.deviceID}.`;
              return;
            }
          }

          addLog(
            'Error decrypting message from device',
            `${message.senderInfo.deviceID}: ${errorMessage}`,
            new Set([logTypes.ERROR, logTypes.OLM]),
          );

          resultDescription =
            'Error decrypting message from device' +
            `${message.senderInfo.deviceID}: ${errorMessage}`;

          if (
            !errorMessage.includes(OLM_ERROR_FLAG) &&
            !errorMessage.includes(olmSessionErrors.sessionDoesNotExist)
          ) {
            throw e;
          }

          const source: 'session_reset' | 'session_not_exists' =
            errorMessage.includes(olmSessionErrors.sessionDoesNotExist)
              ? 'session_not_exists'
              : 'session_reset';

          await createOlmSessionsWithUser(
            message.senderInfo.userID,
            [
              {
                deviceID: message.senderInfo.deviceID,
                sessionCreationOptions: { overwriteContentSession: true },
              },
            ],
            source,
          );
          await resendPeerToPeerMessages(message.senderInfo.deviceID);
        } finally {
          olmDebugLog({
            operation: 'decryptAndPersist',
            messageID: messageID,
            peer: message.senderInfo,
            encryptedData: {
              messageType: message.encryptedData.messageType,
              sessionVersion: message.encryptedData.sessionVersion,
            },
            decryptedData,
            success,
            resultDescription,
          });
        }
      } else if (message.type === peerToPeerMessageTypes.REFRESH_KEY_REQUEST) {
        await debouncedRefreshOneTimeKeys(message, identityClient, olmDebugLog);
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
          await sqliteAPI.removeOutboundP2PMessage(clientMessageID, deviceID);
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
      addLog,
      broadcastDeviceListUpdates,
      createOlmSessionsWithUser,
      dispatch,
      foreignPeerDevices,
      getAndUpdateDeviceListsForUsers,
      getAuthMetadata,
      handleOlmMessageToDevice,
      identityClient,
      olmAPI,
      olmDebugLog,
      resendPeerToPeerMessages,
      sqliteAPI,
    ],
  );
}

const debouncedRefreshOneTimeKeys = _debounce(
  async (
    message: RefreshKeyRequest,
    identityClient: IdentityServiceClient,
    olmDebugLog: OlmDebugLog => mixed,
  ) => {
    const { olmAPI } = getConfig();
    let resultDescription = 'starting',
      success = false;
    try {
      await olmAPI.initializeCryptoAccount();
      resultDescription = 'getting OTKs';
      const oneTimeKeys = await olmAPI.getOneTimeKeys(message.numberOfKeys);
      resultDescription = 'uploading OTKs';
      await identityClient.uploadOneTimeKeys(oneTimeKeys);
      success = true;
    } catch (e) {
      resultDescription = `Error uploading one-time keys: ${
        getMessageForException(e) ?? ''
      }`;
    } finally {
      olmDebugLog({
        operation: 'uploadOneTimeKeys',
        success,
        resultDescription,
      });
    }
  },
  5000,
  { leading: true, trailing: true },
);

export { usePeerToPeerMessageHandler, useHandleOlmMessageToDevice };
