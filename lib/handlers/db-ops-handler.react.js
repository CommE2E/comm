// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { useSendPushNotifs } from '../push/send-hooks.react.js';
import { usePeerToPeerCommunication } from '../tunnelbroker/peer-to-peer-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { DBOpsEntry } from '../types/db-ops-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import {
  type MessageProcessed,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type Props = {
  +processDBStoreOperations: StoreOperations => Promise<mixed>,
};

function DBOpsHandler(props: Props): React.Node {
  const { sqliteAPI } = getConfig();
  const { processDBStoreOperations } = props;
  const queueFront = useSelector(state => state.dbOpsStore.queuedOps[0]);
  const prevQueueFront = React.useRef<?DBOpsEntry>(null);
  const { sendMessageToDevice } = useTunnelbroker();
  const { processOutboundMessages } = usePeerToPeerCommunication();
  const sendPushNotifs = useSendPushNotifs();

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!queueFront || prevQueueFront.current === queueFront) {
      return;
    }
    prevQueueFront.current = queueFront;

    const { ops, messageSourceMetadata, dmOpID, notificationsCreationData } =
      queueFront;

    void (async () => {
      if (ops) {
        await processDBStoreOperations(ops);

        if (notificationsCreationData) {
          void sendPushNotifs(notificationsCreationData);
        }

        if (ops.outboundP2PMessages && ops.outboundP2PMessages.length > 0) {
          const messageIDs = ops.outboundP2PMessages.map(
            message => message.messageID,
          );
          processOutboundMessages(messageIDs, dmOpID);
        }
      }
      dispatch({
        type: opsProcessingFinishedActionType,
      });
      if (messageSourceMetadata) {
        try {
          const { messageID, senderDeviceID } = messageSourceMetadata;
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
          );
        }
      }
    })();
  }, [
    sendPushNotifs,
    queueFront,
    dispatch,
    processDBStoreOperations,
    sendMessageToDevice,
    sqliteAPI,
    processOutboundMessages,
  ]);

  return null;
}

export { DBOpsHandler };
