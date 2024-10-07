// @flow

import * as React from 'react';

import { useTunnelbroker } from './tunnelbroker-context.js';
import {
  useHandleOlmMessageToDevice,
  usePeerToPeerMessageHandler,
} from './use-peer-to-peer-message-handler.js';
import { useLoggedInUserInfo } from '../hooks/account-hooks.js';
import { useActionsQueue } from '../hooks/actions-queue.js';
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

  const [messagesQueue, setMessagesQueue] = React.useState<
    $ReadOnlyArray<{
      +peerToPeerMessage: PeerToPeerMessage,
      +messageID: string,
      +localSocketSessionCounter: number,
    }>,
  >([]);
  const [isProcessing, setProcessing] = React.useState(false);
  const [processedInboundMessages, setProcessedInboundMessages] =
    React.useState(false);

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
      setMessagesQueue(oldQueue => [
        ...oldQueue,
        {
          peerToPeerMessage,
          messageID: message.messageID,
          localSocketSessionCounter: getSessionCounter(),
        },
      ]);
    },
    [getSessionCounter, socketSend],
  );

  const processItem = React.useCallback(
    async (
      item:
        | {
            +type: 'message',
            +message: InboundP2PMessage,
          }
        | {
            +type: 'function',
            +itemFunction: () => mixed,
          },
    ) => {
      if (item.type === 'message') {
        const { message } = item;
        try {
          await handleOlmMessageToDevice(
            message.plaintext,
            { deviceID: message.senderDeviceID, userID: message.senderUserID },
            message.messageID,
          );
        } catch (e) {
          console.log('Failed processing Olm P2P message:', e);
        }
      } else {
        item.itemFunction();
      }
    },
    [handleOlmMessageToDevice],
  );
  const { enqueue } = useActionsQueue(processItem);

  const processPersistedInboundMessages = React.useCallback(async () => {
    if (isProcessing || processedInboundMessages) {
      return;
    }
    setProcessing(true);

    try {
      const { sqliteAPI } = getConfig();
      const messages = await sqliteAPI.getAllInboundP2PMessages();
      enqueue(
        messages.map(message => ({
          type: 'message',
          message,
        })),
      );
    } finally {
      enqueue([
        {
          type: 'function',
          itemFunction: () => {
            setProcessedInboundMessages(true);
            setProcessing(false);
          },
        },
      ]);
    }
  }, [enqueue, isProcessing, processedInboundMessages]);

  const processMessage = React.useCallback(async () => {
    if (messagesQueue.length === 0 || isProcessing) {
      return;
    }

    setProcessing(true);

    const { peerToPeerMessage, messageID, localSocketSessionCounter } =
      messagesQueue[0];

    // Since scheduling processing this message socket is closed
    // or was closed and reopened, we have to stop processing
    // because Tunnelbroker flushes the message again when opening
    // the socket, and we want to process this only once.
    if (
      localSocketSessionCounter !== getSessionCounter() ||
      !doesSocketExist()
    ) {
      setMessagesQueue(currentQueue => currentQueue.slice(1));
      setProcessing(false);
      return;
    }

    try {
      await peerToPeerMessageHandler(peerToPeerMessage, messageID);
    } catch (e) {
      console.log(e.message);
    } finally {
      if (
        localSocketSessionCounter === getSessionCounter() &&
        doesSocketExist()
      ) {
        const confirmation: MessageReceiveConfirmation = {
          type: deviceToTunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
          messageIDs: [messageID],
        };
        socketSend(JSON.stringify(confirmation));
      }
      setMessagesQueue(currentQueue => currentQueue.slice(1));
      setProcessing(false);
    }
  }, [
    doesSocketExist,
    getSessionCounter,
    isProcessing,
    messagesQueue,
    peerToPeerMessageHandler,
    socketSend,
  ]);

  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  React.useEffect(() => {
    if (isProcessing || !viewerID) {
      return;
    }
    if (!processedInboundMessages) {
      void processPersistedInboundMessages();
    } else if (messagesQueue.length > 0) {
      void processMessage();
    }
  }, [
    messagesQueue,
    isProcessing,
    processMessage,
    processedInboundMessages,
    processPersistedInboundMessages,
    viewerID,
  ]);

  React.useEffect(() => {
    addListener(tunnelbrokerMessageListener);
    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [addListener, removeListener, tunnelbrokerMessageListener]);
}

export { PeerToPeerMessageHandler };
