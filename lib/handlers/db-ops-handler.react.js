// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { getAllPeerDevices } from '../selectors/user-selectors.js';
import { usePeerToPeerCommunication } from '../tunnelbroker/peer-to-peer-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { DBOpsEntry } from '../types/db-ops-types.js';
import {
  type MessageProcessed,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function DBOpsHandler(): React.Node {
  const { sqliteAPI } = getConfig();
  const { processDBStoreOperations } = sqliteAPI;
  const queueFront = useSelector(state => state.dbOpsStore.queuedOps[0]);
  const prevQueueFront = React.useRef<?DBOpsEntry>(null);
  const { sendMessageToDevice } = useTunnelbroker();
  const { processOutboundMessages } = usePeerToPeerCommunication();
  const allPeerDevices = useSelector(getAllPeerDevices);

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!queueFront || prevQueueFront.current === queueFront) {
      return;
    }
    prevQueueFront.current = queueFront;

    const { ops, dispatchMetadata, notificationsCreationData } = queueFront;
    void (async () => {
      if (ops) {
        await processDBStoreOperations(ops);
        if (ops.outboundP2PMessages && ops.outboundP2PMessages.length > 0) {
          const allPeerDevicesSet = new Set(allPeerDevices);
          const removeP2PMessagesPromises = [];
          const messageIDs = ops?.outboundP2PMessages
            ?.map(message => {
              if (!allPeerDevicesSet.has(message.deviceID)) {
                removeP2PMessagesPromises.push(
                  sqliteAPI.removeOutboundP2PMessage(
                    message.messageID,
                    message.deviceID,
                  ),
                );
                return null;
              }

              return message.messageID;
            })
            ?.filter(Boolean);
          processOutboundMessages(
            messageIDs,
            dispatchMetadata?.dmOpID,
            notificationsCreationData,
          );
          void Promise.all(removeP2PMessagesPromises);
        }
      }
      dispatch({
        type: opsProcessingFinishedActionType,
      });
      if (dispatchMetadata) {
        try {
          const deviceID = await getContentSigningKey();
          const { messageID, senderDeviceID } = dispatchMetadata;
          if (!messageID || !senderDeviceID) {
            return;
          }
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
    queueFront,
    dispatch,
    processDBStoreOperations,
    sendMessageToDevice,
    sqliteAPI,
    processOutboundMessages,
    allPeerDevices,
  ]);

  return null;
}

export { DBOpsHandler };
