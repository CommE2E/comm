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

type PeerToPeerContextType = {
  +processOutboundMessages: () => void,
};

const PeerToPeerContext: React.Context<?PeerToPeerContextType> =
  React.createContext<?PeerToPeerContextType>();

type Props = {
  +children: React.Node,
};

async function processOutboundP2PMessages(
  sendMessageWithID: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: string,
  ) => Promise<void>,
  sendMessage: (message: TunnelbrokerClientMessageToDevice) => Promise<void>,
  identityContext: IdentityClientContextType,
): Promise<void> {
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

  const authMetadata = await identityContext.getAuthMetadata();
  if (!authMetadata.deviceID || !authMetadata.userID || !authMetadata.userID) {
    return;
  }

  const sendMessageToPeer = async (message: OutboundP2PMessage) => {
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
    await sendMessageWithID(
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
      if (message.status === outboundP2PMessageStatuses.addressed) {
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
            console.log(
              `Error creating session with peer ${peerDeviceID}`,
              err,
            );
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
  const promise = React.useRef<?Promise<void>>(null);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const { sendMessageWithID, sendMessage } = useTunnelbroker();

  const processOutboundMessages = React.useCallback(() => {
    if (!promiseRunning.current) {
      promise.current = (async () => {
        promiseRunning.current = true;
        await processOutboundP2PMessages(
          sendMessageWithID,
          sendMessage,
          identityContext,
        );
        do {
          await processOutboundP2PMessages(
            sendMessageWithID,
            sendMessage,
            identityContext,
          );
        } while (restartPromise.current);
        promiseRunning.current = false;
      })();
    } else {
      restartPromise.current = true;
    }
  }, [identityContext, sendMessage, sendMessageWithID]);

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

function usePeerToPeer(): PeerToPeerContextType {
  const context = React.useContext(PeerToPeerContext);
  invariant(context, 'PeerToPeerContext not found');

  return context;
}

export { PeerToPeerProvider, usePeerToPeer };
