// @flow

import * as React from 'react';

import { useTunnelbroker } from './tunnelbroker-context.js';
import {
  useHandleOlmMessageToDevice,
  usePeerToPeerMessageHandler,
} from './use-peer-to-peer-message-handler.js';
import { useLoggedInUserInfo } from '../hooks/account-hooks.js';
import { useActionsQueue } from '../hooks/actions-queue.js';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors.js';
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
import { getMessageForException } from '../utils/errors.js';

type Props = {
  +socketSend: (message: string) => void,
  +getSessionCounter: () => number,
  +doesSocketExist: () => boolean,
};
function PeerToPeerMessageHandler(props: Props): React.Node {
  const { socketSend, getSessionCounter, doesSocketExist } = props;

  const { addListener, removeListener, socketState } = useTunnelbroker();
  const peerToPeerMessageHandler = usePeerToPeerMessageHandler();
  const handleOlmMessageToDevice = useHandleOlmMessageToDevice();
  const persistedStateLoaded = usePersistedStateLoaded();

  const processItem = React.useCallback(
    async (
      item:
        | {
            +type: 'persisted_message',
            +message: InboundP2PMessage,
          }
        | {
            +type: 'received_message',
            +message: {
              +peerToPeerMessage: PeerToPeerMessage,
              +messageID: string,
              +localSocketSessionCounter: number,
            },
          },
    ) => {
      if (item.type === 'persisted_message') {
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
        const { peerToPeerMessage, messageID, localSocketSessionCounter } =
          item.message;
        // Since scheduling processing this message socket is closed
        // or was closed and reopened, we have to stop processing
        // because Tunnelbroker flushes the message again when opening
        // the socket, and we want to process this only once.
        if (
          localSocketSessionCounter !== getSessionCounter() ||
          !doesSocketExist()
        ) {
          return;
        }

        try {
          await peerToPeerMessageHandler(peerToPeerMessage, messageID);
        } catch (e) {
          console.log(getMessageForException(e));
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
        }
      }
    },
    [
      doesSocketExist,
      getSessionCounter,
      handleOlmMessageToDevice,
      peerToPeerMessageHandler,
      socketSend,
    ],
  );
  const { enqueue } = useActionsQueue(
    processItem,
    persistedStateLoaded && !!socketState.isAuthorized,
  );

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
          getMessageForException(e),
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
      enqueue([
        {
          type: 'received_message',
          message: {
            peerToPeerMessage,
            messageID: message.messageID,
            localSocketSessionCounter: getSessionCounter(),
          },
        },
      ]);
    },
    [enqueue, getSessionCounter, socketSend],
  );

  React.useEffect(() => {
    addListener(tunnelbrokerMessageListener);
    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [addListener, removeListener, tunnelbrokerMessageListener]);

  const processPersistedInboundMessages = React.useCallback(async () => {
    try {
      const { sqliteAPI } = getConfig();
      const messages = await sqliteAPI.getAllInboundP2PMessages();
      enqueue(
        messages.map(message => ({
          type: 'persisted_message',
          message,
        })),
      );
    } catch (e) {
      console.log(
        'error while reading persisted inbound messages:',
        getMessageForException(e),
      );
    }
  }, [enqueue]);

  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;

  const processingInputMessagesStarted = React.useRef(false);
  React.useEffect(() => {
    if (!viewerID || processingInputMessagesStarted.current) {
      return;
    }
    processingInputMessagesStarted.current = true;
    void processPersistedInboundMessages();
  }, [processPersistedInboundMessages, viewerID]);
}

export { PeerToPeerMessageHandler };
