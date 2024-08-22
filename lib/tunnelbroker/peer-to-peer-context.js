// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  type TunnelbrokerClientMessageToDevice,
  useTunnelbroker,
} from './tunnelbroker-context.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import { getAllPeerUserIDAndDeviceIDs } from '../selectors/user-selectors.js';
import {
  createMessagesToPeersFromDMOp,
  type OutboundDMOperationSpecification,
} from '../shared/dm-ops/dm-op-utils.js';
import {
  type AuthMetadata,
  IdentityClientContext,
  type IdentityClientContextType,
} from '../shared/identity-client-context.js';
import { scheduleP2PMessagesActionType } from '../types/dm-ops.js';
import {
  type OutboundP2PMessage,
  outboundP2PMessageStatuses,
} from '../types/sqlite-types.js';
import {
  type EncryptedMessage,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getMessageForException } from '../utils/errors.js';
import { olmSessionErrors } from '../utils/olm-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type PeerToPeerContextType = {
  +processOutboundMessages: (
    outboundMessageIDs: ?$ReadOnlyArray<string>,
    dmOpID: ?string,
  ) => void,
  +sendDMOperation: (
    op: OutboundDMOperationSpecification,
  ) => Promise<$ReadOnlyArray<string>>,
  +broadcastEphemeralMessage: (
    contentPayload: string,
    recipients: $ReadOnlyArray<{ +userID: string, +deviceID: string }>,
    authMetadata: AuthMetadata,
  ) => Promise<void>,
};

const PeerToPeerContext: React.Context<?PeerToPeerContextType> =
  React.createContext<?PeerToPeerContextType>();

type Props = {
  +children: React.Node,
};

async function processOutboundP2PMessages(
  sendMessage: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: ?string,
  ) => Promise<void>,
  identityContext: IdentityClientContextType,
  peerOlmSessionsCreator: (userID: string, deviceID: string) => Promise<void>,
  messageIDs: ?$ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<string>> {
  let authMetadata;
  try {
    authMetadata = await identityContext.getAuthMetadata();
  } catch (e) {
    return [];
  }
  if (
    !authMetadata.deviceID ||
    !authMetadata.userID ||
    !authMetadata.accessToken
  ) {
    return [];
  }

  const { olmAPI, sqliteAPI } = getConfig();
  await olmAPI.initializeCryptoAccount();
  let messages;
  if (messageIDs) {
    messages = await sqliteAPI.getOutboundP2PMessagesByID(messageIDs);
  } else {
    const allMessages = await sqliteAPI.getAllOutboundP2PMessages();
    messages = allMessages.filter(message => message.supportsAutoRetry);
  }

  const devicesMap: { [deviceID: string]: OutboundP2PMessage[] } = {};
  for (const message: OutboundP2PMessage of messages) {
    if (!devicesMap[message.deviceID]) {
      devicesMap[message.deviceID] = [message];
    } else {
      devicesMap[message.deviceID].push(message);
    }
  }

  const sentMessagesMap: { [messageID: string]: boolean } = {};

  const sendMessageToPeer = async (
    message: OutboundP2PMessage,
  ): Promise<void> => {
    if (!authMetadata.deviceID || !authMetadata.userID) {
      return;
    }
    try {
      const encryptedMessage: EncryptedMessage = {
        type: peerToPeerMessageTypes.ENCRYPTED_MESSAGE,
        senderInfo: {
          deviceID: authMetadata.deviceID,
          userID: authMetadata.userID,
        },
        encryptedData: JSON.parse(message.ciphertext),
      };
      await sendMessage(
        {
          deviceID: message.deviceID,
          payload: JSON.stringify(encryptedMessage),
        },
        message.messageID,
      );
      await sqliteAPI.markOutboundP2PMessageAsSent(
        message.messageID,
        message.deviceID,
      );
      sentMessagesMap[message.messageID] = true;
    } catch (e) {
      console.error(e);
    }
  };

  for (const peerDeviceID in devicesMap) {
    for (const message of devicesMap[peerDeviceID]) {
      if (message.status === outboundP2PMessageStatuses.persisted) {
        try {
          const result = await olmAPI.encryptAndPersist(
            message.plaintext,
            message.deviceID,
            message.messageID,
          );

          const encryptedMessage: OutboundP2PMessage = {
            ...message,
            ciphertext: JSON.stringify(result),
          };
          await sendMessageToPeer(encryptedMessage);
        } catch (e) {
          if (!e.message?.includes(olmSessionErrors.sessionDoesNotExists)) {
            console.log(`Error sending messages to peer ${peerDeviceID}`, e);
            break;
          }
          try {
            await peerOlmSessionsCreator(message.userID, peerDeviceID);
            const result = await olmAPI.encryptAndPersist(
              message.plaintext,
              message.deviceID,
              message.messageID,
            );
            const encryptedMessage: OutboundP2PMessage = {
              ...message,
              ciphertext: JSON.stringify(result),
            };

            await sendMessageToPeer(encryptedMessage);
          } catch (err) {
            console.log(`Error sending messages to peer ${peerDeviceID}`, err);
            break;
          }
        }
      } else if (message.status === outboundP2PMessageStatuses.encrypted) {
        await sendMessageToPeer(message);
      } else if (message.status === outboundP2PMessageStatuses.sent) {
        // Handle edge-case when message was sent, but it wasn't updated
        // in the message store.
        sentMessagesMap[message.messageID] = true;
      }
    }
  }
  return Object.keys(sentMessagesMap);
}

const AUTOMATIC_RETRY_FREQUENCY = 30 * 1000;

function PeerToPeerProvider(props: Props): React.Node {
  const { children } = props;

  const { sendMessageToDevice } = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const dispatch = useDispatch();
  const dmOpsSendingPromiseResolvers = React.useRef<
    Map<
      string,
      {
        +resolve: ($ReadOnlyArray<string>) => mixed,
        +reject: Error => mixed,
      },
    >,
  >(new Map());
  const allPeerUserIDAndDeviceIDs = useSelector(getAllPeerUserIDAndDeviceIDs);
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  // This returns a promise that will be resolved with arrays of successfully
  // sent messages, so in case of failing all messages (e.g. no internet
  // connection) it will still resolve but with an empty array.
  const sendDMOperation = React.useCallback(
    async (op: OutboundDMOperationSpecification) => {
      const dmOpID = uuid.v4();
      const promise = new Promise<$ReadOnlyArray<string>>((resolve, reject) => {
        dmOpsSendingPromiseResolvers.current.set(dmOpID, { resolve, reject });
      });

      const messages = await createMessagesToPeersFromDMOp(
        op,
        allPeerUserIDAndDeviceIDs,
        currentUserInfo,
      );
      dispatch({
        type: scheduleP2PMessagesActionType,
        payload: {
          dmOpID,
          messages,
        },
      });

      return promise;
    },
    [allPeerUserIDAndDeviceIDs, currentUserInfo, dispatch],
  );

  const processingQueue = React.useRef<
    Array<{
      +outboundMessageIDs: ?$ReadOnlyArray<string>,
      +dmOpID: ?string,
    }>,
  >([]);
  const promiseRunning = React.useRef<boolean>(false);

  const { createOlmSessionsWithPeer: peerOlmSessionsCreator } =
    usePeerOlmSessionsCreatorContext();

  const processOutboundMessages = React.useCallback(
    (outboundMessageIDs: ?$ReadOnlyArray<string>, dmOpID: ?string) => {
      processingQueue.current.push({ outboundMessageIDs, dmOpID });
      if (!promiseRunning.current) {
        promiseRunning.current = true;
        void (async () => {
          do {
            const queueFront = processingQueue.current.shift();
            try {
              const sentMessagesIDs = await processOutboundP2PMessages(
                sendMessageToDevice,
                identityContext,
                peerOlmSessionsCreator,
                queueFront?.outboundMessageIDs,
              );
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current
                  .get(queueFront.dmOpID)
                  ?.resolve?.(sentMessagesIDs);
              }
            } catch (e) {
              console.log(
                `Error processing outbound P2P messages: ${
                  getMessageForException(e) ?? 'unknown'
                }`,
              );
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current
                  .get(queueFront.dmOpID)
                  ?.reject?.(e);
              }
            } finally {
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current.delete(queueFront.dmOpID);
              }
            }
          } while (processingQueue.current.length > 0);
          promiseRunning.current = false;
        })();
      }
    },
    [peerOlmSessionsCreator, identityContext, sendMessageToDevice],
  );

  const broadcastEphemeralMessage = React.useCallback(
    async (
      contentPayload: string,
      recipients: $ReadOnlyArray<{ +userID: string, +deviceID: string }>,
      authMetadata: AuthMetadata,
    ) => {
      const { userID: thisUserID, deviceID: thisDeviceID } = authMetadata;
      if (!thisDeviceID || !thisUserID) {
        throw new Error('No auth metadata');
      }
      const { olmAPI } = getConfig();
      await olmAPI.initializeCryptoAccount();

      // We want it distinct by device ID to avoid potentially creating
      // multiple Olm sessions with the same device simultaneously.
      const recipientsDistinctByDeviceID = [
        ...new Map(recipients.map(item => [item.deviceID, item])).values(),
      ];
      const senderInfo = { deviceID: thisDeviceID, userID: thisUserID };
      const promises = recipientsDistinctByDeviceID.map(async recipient => {
        try {
          const encryptedData = await olmAPI.encrypt(
            contentPayload,
            recipient.deviceID,
          );
          const encryptedMessage: EncryptedMessage = {
            type: peerToPeerMessageTypes.ENCRYPTED_MESSAGE,
            senderInfo,
            encryptedData,
          };
          await sendMessageToDevice({
            deviceID: recipient.deviceID,
            payload: JSON.stringify(encryptedMessage),
          });
        } catch (e) {
          if (!e.message?.includes(olmSessionErrors.sessionDoesNotExists)) {
            console.log(
              `Error sending messages to peer ${recipient.deviceID}`,
              e,
            );
            return;
          }
          try {
            await peerOlmSessionsCreator(recipient.userID, recipient.deviceID);
            const encryptedData = await olmAPI.encrypt(
              contentPayload,
              recipient.deviceID,
            );
            const encryptedMessage: EncryptedMessage = {
              type: peerToPeerMessageTypes.ENCRYPTED_MESSAGE,
              senderInfo,
              encryptedData,
            };
            await sendMessageToDevice({
              deviceID: recipient.deviceID,
              payload: JSON.stringify(encryptedMessage),
            });
          } catch (err) {
            console.warn(
              `Error sending Olm-encrypted message to device ${recipient.deviceID}:`,
              err,
            );
          }
        }
      });
      await Promise.all(promises);
    },
    [peerOlmSessionsCreator, sendMessageToDevice],
  );

  React.useEffect(() => {
    const intervalID = setInterval(
      processOutboundMessages,
      AUTOMATIC_RETRY_FREQUENCY,
    );
    return () => clearInterval(intervalID);
  }, [processOutboundMessages]);

  const value: PeerToPeerContextType = React.useMemo(
    () => ({
      processOutboundMessages,
      sendDMOperation,
      broadcastEphemeralMessage,
    }),
    [broadcastEphemeralMessage, processOutboundMessages, sendDMOperation],
  );

  return (
    <PeerToPeerContext.Provider value={value}>
      {children}
    </PeerToPeerContext.Provider>
  );
}

function usePeerToPeerCommunication(): PeerToPeerContextType {
  const context = React.useContext(PeerToPeerContext);
  invariant(context, 'PeerToPeerContext not found');

  return context;
}

export { PeerToPeerProvider, usePeerToPeerCommunication };
