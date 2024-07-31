// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  type TunnelbrokerClientMessageToDevice,
  useTunnelbroker,
} from './tunnelbroker-context.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import {
  createMessagesToPeersFromDMOp,
  type DMOperationSpecification,
} from '../shared/dm-ops/dm-op-utils.js';
import {
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
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type PeerToPeerContextType = {
  +processOutboundMessages: (
    outboundMessageIDs: ?$ReadOnlyArray<string>,
    dmOpID: ?string,
  ) => void,
  +sendDMOperation: (op: DMOperationSpecification) => Promise<void>,
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
): Promise<void> {
  const authMetadata = await identityContext.getAuthMetadata();
  if (
    !authMetadata.deviceID ||
    !authMetadata.userID ||
    !authMetadata.accessToken
  ) {
    return;
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

  const sendMessageToPeer = async (
    message: OutboundP2PMessage,
  ): Promise<void> => {
    if (!authMetadata.deviceID || !authMetadata.userID) {
      return;
    }
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
      }
    }
  }
}

const AUTOMATIC_RETRY_FREQUENCY = 30 * 1000;

function PeerToPeerProvider(props: Props): React.Node {
  const { children } = props;

  const { sendMessageToDevice } = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const dispatch = useDispatch();
  const dmOpsSendingPromiseResolvers = React.useRef<
    Map<string, { +resolve: () => mixed, +reject: Error => mixed }>,
  >(new Map());
  const auxUserStore = useSelector(state => state.auxUserStore);
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const sendDMOperation = React.useCallback(
    async (op: DMOperationSpecification) => {
      const dmOpID = uuid.v4();
      const promise = new Promise<void>((resolve, reject) => {
        dmOpsSendingPromiseResolvers.current.set(dmOpID, { resolve, reject });
      });

      const messages = await createMessagesToPeersFromDMOp(
        op,
        auxUserStore,
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
    [auxUserStore, currentUserInfo, dispatch],
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
              await processOutboundP2PMessages(
                sendMessageToDevice,
                identityContext,
                peerOlmSessionsCreator,
                queueFront?.outboundMessageIDs,
              );
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current
                  .get(queueFront.dmOpID)
                  ?.resolve?.();
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
    }),
    [processOutboundMessages, sendDMOperation],
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
