// @flow

import * as React from 'react';

import { useTunnelbroker } from './tunnelbroker-context.js';
import {
  useHandleOlmMessageToDevice,
  usePeerToPeerMessageHandler,
} from './use-peer-to-peer-message-handler.js';
import type { InboundP2PMessage } from '../types/sqlite-types.js';
import type { MessageReceiveConfirmation } from '../types/tunnelbroker/message-receive-confirmation-types.js';
import {
  deviceToTunnelbrokerMessageTypes,
  type TunnelbrokerToDeviceMessage,
  tunnelbrokerToDeviceMessageTypes,
} from '../types/tunnelbroker/messages.js';
import {
  peerToPeerMessageValidator,
  type PeerToPeerMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';

type Props = {
  +socketSend: (message: string) => void,
  +getSessionCounter: () => number,
  +doesSocketExist: () => boolean,
};
function PeerToPeerMessageHandler(props: Props): React.Node {
  const { socketSend, getSessionCounter, doesSocketExist } = props;

  const { addListener, removeListener } = useTunnelbroker();
  const peerToPeerMessageHandler = usePeerToPeerMessageHandler();
  const handleOlmMessageToDevice = useHandleOlmMessageToDevice();

  const currentlyProcessedMessage = React.useRef<?Promise<mixed>>(null);

  React.useEffect(() => {
    if (currentlyProcessedMessage.current) {
      return;
    }
    currentlyProcessedMessage.current = (async () => {
      const { sqliteAPI } = getConfig();
      const messages = await sqliteAPI.getAllInboundP2PMessages();

      for (const message: InboundP2PMessage of messages) {
        try {
          await handleOlmMessageToDevice(
            message.plaintext,
            { deviceID: message.senderDeviceID, userID: message.senderUserID },
            message.messageID,
          );
        } catch (e) {
          console.log('Failed processing Olm P2P message:', e);
        }
      }
    })();
  }, [handleOlmMessageToDevice]);

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerToDeviceMessage) => {
      if (message.type !== tunnelbrokerToDeviceMessageTypes.MESSAGE_TO_DEVICE) {
        return;
      }
      const confirmation: MessageReceiveConfirmation = {
        type: deviceToTunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
        messageIDs: [message.messageID],
      };

      let rawPeerToPeerMessage;
      try {
        rawPeerToPeerMessage = JSON.parse(message.payload);
      } catch (e) {
        console.log(
          'error while parsing Tunnelbroker peer-to-peer message:',
          e.message,
        );
        // Client received incorrect message, confirm to remove from
        // Tunnelbroker queue.
        socketSend(JSON.stringify(confirmation));
        return;
      }

      if (!peerToPeerMessageValidator.is(rawPeerToPeerMessage)) {
        console.log('invalid Tunnelbroker PeerToPeerMessage');
        // The client received an invalid Tunnelbroker message,
        // and cannot process this type of request.
        socketSend(JSON.stringify(confirmation));
        return;
      }
      const peerToPeerMessage: PeerToPeerMessage = rawPeerToPeerMessage;
      currentlyProcessedMessage.current = (async () => {
        const localSocketSessionCounter = getSessionCounter();
        await currentlyProcessedMessage.current;
        // Since scheduling processing this message socket is closed
        // or was closed and reopened, we have to stop processing
        // because Tunnelbroker flushes the message again when opening
        // the socket, and we want to process this only once
        // to maintain order.
        if (
          localSocketSessionCounter !== getSessionCounter() ||
          !doesSocketExist()
        ) {
          return;
        }
        try {
          await peerToPeerMessageHandler(peerToPeerMessage, message.messageID);
        } catch (e) {
          console.log(e.message);
        } finally {
          if (
            localSocketSessionCounter === getSessionCounter() &&
            doesSocketExist()
          ) {
            // We confirm regardless of success or error while processing.
            socketSend(JSON.stringify(confirmation));
          }
        }
      })();
    },
    [getSessionCounter, peerToPeerMessageHandler, doesSocketExist, socketSend],
  );

  React.useEffect(() => {
    addListener(tunnelbrokerMessageListener);
    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [addListener, removeListener, tunnelbrokerMessageListener]);
}

export { PeerToPeerMessageHandler };
