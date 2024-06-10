// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useTunnelbroker } from './tunnelbroker-context.js';
import { peerToPeerMessageHandler } from '../handlers/peer-to-peer-message-handler.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { MessageReceiveConfirmation } from '../types/tunnelbroker/message-receive-confirmation-types.js';
import {
  tunnelbrokerMessageTypes,
  type TunnelbrokerMessage,
} from '../types/tunnelbroker/messages.js';
import {
  peerToPeerMessageValidator,
  type PeerToPeerMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';

type Props = {
  +socketSend: (message: string) => void,
  +getSessionCounter: () => number,
  +ifSocketExists: () => boolean,
};
function PeerToPeerMessageHandler(props: Props): React.Node {
  const { socketSend, getSessionCounter, ifSocketExists } = props;

  const { addListener, removeListener } = useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { identityClient } = identityContext;

  const currentlyProcessedMessage = React.useRef<?Promise<mixed>>(null);

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerMessage) => {
      if (message.type !== tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE) {
        return;
      }
      const confirmation: MessageReceiveConfirmation = {
        type: tunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
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
          !ifSocketExists()
        ) {
          return;
        }
        try {
          await peerToPeerMessageHandler(
            peerToPeerMessage,
            identityClient,
            message.messageID,
          );
        } catch (e) {
          console.log(e.message);
        } finally {
          if (
            localSocketSessionCounter === getSessionCounter() &&
            ifSocketExists()
          ) {
            // We confirm regardless of success or error while processing.
            socketSend(JSON.stringify(confirmation));
          }
        }
      })();
    },
    [getSessionCounter, identityClient, ifSocketExists, socketSend],
  );

  React.useEffect(() => {
    addListener(tunnelbrokerMessageListener);
    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [addListener, removeListener, tunnelbrokerMessageListener]);
}

export { PeerToPeerMessageHandler };
