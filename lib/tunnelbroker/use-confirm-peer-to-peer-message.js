// @flow

import * as React from 'react';

import { useTunnelbroker } from './tunnelbroker-context.js';
import type { DispatchMetadata } from '../types/redux-types.js';
import {
  type MessageProcessed,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';

function useConfirmPeerToPeerMessage(): (
  messageMetadata: ?DispatchMetadata,
) => Promise<void> {
  const { sqliteAPI } = getConfig();
  const { sendMessageToDevice } = useTunnelbroker();

  return React.useCallback(
    async (messageMetadata: ?DispatchMetadata): Promise<void> => {
      try {
        if (!messageMetadata) {
          return;
        }
        const { messageID, senderDeviceID } = messageMetadata;
        if (!messageID || !senderDeviceID) {
          return;
        }
        const deviceID = await getContentSigningKey();

        const message: MessageProcessed = {
          type: peerToPeerMessageTypes.MESSAGE_PROCESSED,
          messageID,
          deviceID,
        };

        await sendMessageToDevice({
          deviceID: senderDeviceID,
          payload: JSON.stringify(message),
        });
        await sqliteAPI.removeInboundP2PMessages([messageID]);
      } catch (e) {
        console.log(
          `Error while sending confirmation: ${
            getMessageForException(e) ?? 'unknown error'
          }`,
          e,
        );
      }
    },
    [sendMessageToDevice, sqliteAPI],
  );
}

export { useConfirmPeerToPeerMessage };
