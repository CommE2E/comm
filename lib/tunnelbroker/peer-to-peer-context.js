// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  type TunnelbrokerClientMessageToDevice,
  useTunnelbroker,
} from './tunnelbroker-context.js';
import {
  IdentityClientContext,
  type IdentityClientContextType,
} from '../shared/identity-client-context.js';
import {
  type OutboundP2PMessage,
  outboundP2PMessageStatuses,
} from '../types/sqlite-types.js';
import {
  type EncryptedMessage,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { createOlmSessionWithPeer } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';

type PeerToPeerContextType = {
  +processOutboundMessages: () => void,
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
): Promise<void> {
  const authMetadata = await identityContext.getAuthMetadata();
  if (!authMetadata.deviceID || !authMetadata.userID || !authMetadata.userID) {
    return;
  }

  const { olmAPI, sqliteAPI } = getConfig();
  await olmAPI.initializeCryptoAccount();
  const messages = await sqliteAPI.getAllOutboundP2PMessage();

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
            await createOlmSessionWithPeer(
              authMetadata,
              identityContext.identityClient,
              sendMessage,
              message.userID,
              peerDeviceID,
            );
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

function PeerToPeerProvider(props: Props): React.Node {
  const { children } = props;

  const restartPromise = React.useRef<boolean>(false);
  const promiseRunning = React.useRef<boolean>(false);

  const { sendMessage } = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const processOutboundMessages = React.useCallback(() => {
    if (!promiseRunning.current) {
      promiseRunning.current = true;
      void (async () => {
        do {
          restartPromise.current = false;
          try {
            await processOutboundP2PMessages(sendMessage, identityContext);
          } catch (e) {
            console.log(
              `Error processing outbound P2P messages: ${
                getMessageForException(e) ?? 'unknown'
              }`,
            );
          }
        } while (restartPromise.current);
        promiseRunning.current = false;
      })();
    } else {
      restartPromise.current = true;
    }
  }, [identityContext, sendMessage]);

  const value: PeerToPeerContextType = React.useMemo(
    () => ({
      processOutboundMessages,
    }),
    [processOutboundMessages],
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
