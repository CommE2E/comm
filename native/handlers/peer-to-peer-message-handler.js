// @flow

import {
  type PeerToPeerMessage,
  peerToPeerMessageTypes,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';

import { nativeInboundContentSessionCreator } from '../utils/crypto-utils.js';

async function peerToPeerMessageHandler(
  message: PeerToPeerMessage,
): Promise<void> {
  if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
    try {
      const result = await nativeInboundContentSessionCreator(message);
      console.log(
        `Created inbound session with device ${message.senderInfo.deviceID}: ${result}`,
      );
    } catch (e) {
      console.log(
        `Error creating inbound session with device ${message.senderInfo.deviceID}: ${e.message}`,
      );
    }
  } else if (message.type === peerToPeerMessageTypes.ENCRYPTED_MESSAGE) {
    console.log('Received encrypted message');
  }
}

export { peerToPeerMessageHandler };
