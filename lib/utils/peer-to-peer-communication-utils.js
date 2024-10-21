// @flow

import { getConfig } from './config.js';
import { getMessageForException } from './errors.js';
import { olmSessionErrors } from './olm-utils.js';
import { type AuthMetadata } from '../shared/identity-client-context.js';
import { type P2PMessageRecipient } from '../tunnelbroker/peer-to-peer-context.js';
import type { TunnelbrokerClientMessageToDevice } from '../tunnelbroker/tunnelbroker-context.js';
import {
  outboundP2PMessageStatuses,
  type OutboundP2PMessage,
} from '../types/sqlite-types.js';
import {
  peerToPeerMessageTypes,
  type EncryptedMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';

function getClientMessageIDFromTunnelbrokerMessageID(
  tunnelbrokerMessageID: string,
): string {
  const ids = tunnelbrokerMessageID.split('#');
  if (ids.length !== 2) {
    throw new Error('Invalid tunnelbrokerMessageID');
  }
  return ids[1];
}

async function sendMessageToPeer(
  message: OutboundP2PMessage,
  authMetadata: ?AuthMetadata,
  sendMessage: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: ?string,
  ) => Promise<void>,
): Promise<'success' | 'failure'> {
  const { sqliteAPI } = getConfig();

  if (!authMetadata || !authMetadata.deviceID || !authMetadata.userID) {
    return 'failure';
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
    return 'success';
  } catch (e) {
    console.error(e);
    return 'failure';
  }
}

async function encryptAndSendMessageToPeer(
  message: OutboundP2PMessage,
  authMetadata: ?AuthMetadata,
  sendMessage: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: ?string,
  ) => Promise<void>,
): Promise<'success' | 'failure' | 'missing_session'> {
  const { olmAPI } = getConfig();

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
    return await sendMessageToPeer(encryptedMessage, authMetadata, sendMessage);
  } catch (e) {
    if (
      getMessageForException(e)?.includes(olmSessionErrors.sessionDoesNotExist)
    ) {
      return 'missing_session';
    }
    console.log(`Error sending messages to peer ${message.deviceID}`, e);
    return 'failure';
  }
}

export type HandleOutboundP2PMessageResult = {
  +status: 'success' | 'failure' | 'missing_session',
  +messageID: string,
};
async function handleOutboundP2PMessage(
  message: OutboundP2PMessage,
  authMetadata: ?AuthMetadata,
  sendMessage: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: ?string,
  ) => Promise<void>,
): Promise<HandleOutboundP2PMessageResult> {
  if (message.status === outboundP2PMessageStatuses.persisted) {
    const status = await encryptAndSendMessageToPeer(
      message,
      authMetadata,
      sendMessage,
    );
    return {
      status,
      messageID: message.messageID,
    };
  } else if (message.status === outboundP2PMessageStatuses.encrypted) {
    const status = await sendMessageToPeer(message, authMetadata, sendMessage);
    return {
      status,
      messageID: message.messageID,
    };
  } else if (message.status === outboundP2PMessageStatuses.sent) {
    // Handle edge-case when message was sent, but it wasn't updated
    // in the message store.
    return {
      status: 'success',
      messageID: message.messageID,
    };
  }
  return {
    status: 'failure',
    messageID: message.messageID,
  };
}

export type EphemeralEncryptAndSendMessageToPeerResult = {
  +status: 'success' | 'failure' | 'missing_session',
  +recipient: P2PMessageRecipient,
};
async function ephemeralEncryptAndSendMessageToPeer(
  contentPayload: string,
  recipient: P2PMessageRecipient,
  authMetadata: ?AuthMetadata,
  sendMessage: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: ?string,
  ) => Promise<void>,
): Promise<EphemeralEncryptAndSendMessageToPeerResult> {
  const { olmAPI } = getConfig();

  if (!authMetadata || !authMetadata.deviceID || !authMetadata.userID) {
    return { status: 'failure', recipient };
  }
  const senderInfo = {
    deviceID: authMetadata.deviceID,
    userID: authMetadata.userID,
  };

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
    await sendMessage({
      deviceID: recipient.deviceID,
      payload: JSON.stringify(encryptedMessage),
    });

    return { status: 'success', recipient };
  } catch (e) {
    if (
      getMessageForException(e)?.includes(olmSessionErrors.sessionDoesNotExist)
    ) {
      return { status: 'missing_session', recipient };
    }
    console.log(`Error sending messages to peer ${recipient.deviceID}`, e);
    return { status: 'failure', recipient };
  }
}

export {
  getClientMessageIDFromTunnelbrokerMessageID,
  sendMessageToPeer,
  encryptAndSendMessageToPeer,
  ephemeralEncryptAndSendMessageToPeer,
  handleOutboundP2PMessage,
};
