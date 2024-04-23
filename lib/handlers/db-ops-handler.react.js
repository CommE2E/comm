// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { DBOpsEntry } from '../types/db-ops-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import {
  type MessageProcessed,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type Props = {
  +processDBStoreOperations: StoreOperations => Promise<mixed>,
};

function DBOpsHandler(props: Props): React.Node {
  const { sqliteAPI } = getConfig();
  const { processDBStoreOperations } = props;
  const queueFront = useSelector(state => state.dbOpsStore.queuedOps[0]);
  const prevQueueFront = React.useRef<?DBOpsEntry>(null);
  const { sendMessage } = useTunnelbroker();

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!queueFront || prevQueueFront.current === queueFront) {
      return;
    }
    prevQueueFront.current = queueFront;

    const { ops, messageSourceMetadata } = queueFront;
    void (async () => {
      if (ops) {
        await processDBStoreOperations(ops);
      }
      dispatch({
        type: opsProcessingFinishedActionType,
      });
      if (messageSourceMetadata) {
        const { messageID, senderDeviceID } = messageSourceMetadata;
        const message: MessageProcessed = {
          type: peerToPeerMessageTypes.MESSAGE_PROCESSED,
          messageID,
        };
        await sendMessage({
          deviceID: senderDeviceID,
          payload: JSON.stringify(message),
        });
        await sqliteAPI.removeReceivedMessagesToDevice([messageID]);
      }
    })();
  }, [queueFront, dispatch, processDBStoreOperations, sendMessage, sqliteAPI]);

  return null;
}

export { DBOpsHandler };
