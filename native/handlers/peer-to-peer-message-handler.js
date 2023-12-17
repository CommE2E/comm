// @flow

import {
  type PeerToPeerMessage,
  peerToPeerMessageTypes,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';

async function peerToPeerMessageHandler(
  message: PeerToPeerMessage,
): Promise<void> {
  if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
    console.log('Received session creation request');
  } else if (message.type === peerToPeerMessageTypes.ENCRYPTED_MESSAGE) {
    console.log('Received encrypted message');
  }
}

export { peerToPeerMessageHandler };
