// @flow

import invariant from 'invariant';
import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import type { DBOpsEntry } from '../types/db-ops-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import {
  type MessageProcessed,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';
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
  const { sendMessage } = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

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
        try {
          const { messageID, senderDeviceID } = messageSourceMetadata;
          const { deviceID } = await identityContext.getAuthMetadata();
          if (!deviceID) {
            return;
          }
          const message: MessageProcessed = {
            type: peerToPeerMessageTypes.MESSAGE_PROCESSED,
            messageID,
            deviceID,
          };
          await sendMessage({
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
    sendMessage,
    sqliteAPI,
    identityContext,
  ]);

  return null;
}

export { DBOpsHandler };
