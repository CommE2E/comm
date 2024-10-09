// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { usePeerToPeerCommunication } from '../tunnelbroker/peer-to-peer-context.js';
import { useConfirmPeerToPeerMessage } from '../tunnelbroker/use-confirm-peer-to-peer-message.js';
import type { DBOpsEntry } from '../types/db-ops-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function DBOpsHandler(): React.Node {
  const { sqliteAPI } = getConfig();
  const { processDBStoreOperations } = sqliteAPI;
  const queueFront = useSelector(state => state.dbOpsStore.queuedOps[0]);
  const prevQueueFront = React.useRef<?DBOpsEntry>(null);
  const { processOutboundMessages } = usePeerToPeerCommunication();
  const confirmPeerToPeerMessage = useConfirmPeerToPeerMessage();

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
          const messageIDs = ops.outboundP2PMessages.map(
            message => message.messageID,
          );
          processOutboundMessages(
            messageIDs,
            dispatchMetadata?.dmOpID,
            notificationsCreationData,
          );
        }
      }
      dispatch({
        type: opsProcessingFinishedActionType,
      });
      void confirmPeerToPeerMessage(dispatchMetadata);
    })();
  }, [
    queueFront,
    dispatch,
    processDBStoreOperations,
    processOutboundMessages,
    confirmPeerToPeerMessage,
  ]);

  return null;
}

export { DBOpsHandler };
