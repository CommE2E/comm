// @flow

import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import uuid from 'uuid';

import { dmOpSpecs } from './dm-op-specs.js';
import type { DMOperationSpecification } from './dm-op-utils.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useDispatchWithMessageSource } from '../../hooks/ops-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import { usePeerToPeerCommunication } from '../../tunnelbroker/peer-to-peer-context.js';
import type { MessageSourceMetadata } from '../../types/db-ops-types.js';
import {
  type DMOperation,
  processDMOpsActionType,
  queueDMOpsActionType,
} from '../../types/dm-ops.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { useSelector } from '../../utils/redux-utils.js';

function useProcessDMOperation(): (
  dmOp: DMOperation,
  metadata: ?MessageSourceMetadata,
) => Promise<void> {
  const fetchMessage = useGetLatestMessageEdit();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const utilities = React.useMemo(
    () => ({
      fetchMessage,
      threadInfos,
    }),
    [fetchMessage, threadInfos],
  );

  const dispatchWithMessageSource = useDispatchWithMessageSource();
  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  return React.useCallback(
    async (dmOp: DMOperation, metadata: ?MessageSourceMetadata) => {
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return;
      }
      const processingCheckResult = dmOpSpecs[dmOp.type].canBeProcessed(
        dmOp,
        viewerID,
        utilities,
      );
      if (!processingCheckResult.isProcessingPossible) {
        if (processingCheckResult.reason.type === 'missing_thread') {
          dispatchWithMessageSource(
            {
              type: queueDMOpsActionType,
              payload: {
                operation: dmOp,
                threadID: processingCheckResult.reason.threadID,
                timestamp: Date.now(),
              },
            },
            metadata,
          );
        }
        return;
      }
      const { rawMessageInfos, updateInfos } = await dmOpSpecs[
        dmOp.type
      ].processDMOperation(dmOp, viewerID, utilities);

      const { rawMessageInfos: allNewMessageInfos } =
        mergeUpdatesWithMessageInfos(rawMessageInfos, updateInfos);
      const messagesByThreadID = _groupBy(message => message.threadID)(
        allNewMessageInfos,
      );
      for (const threadID in messagesByThreadID) {
        const messagesFromOtherPeers = messagesByThreadID[threadID].filter(
          message => message.creatorID !== viewerID,
        );
        if (messagesFromOtherPeers.length === 0) {
          continue;
        }
        // We take the most recent timestamp to make sure that updates older
        // than it won't flip the status to read.
        const time = Math.max(
          messagesFromOtherPeers.map(message => message.time),
        );
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID,
          unread: true,
        });
      }

      dispatchWithMessageSource(
        {
          type: processDMOpsActionType,
          payload: {
            rawMessageInfos,
            updateInfos,
          },
        },
        metadata,
      );
    },
    [viewerID, utilities, dispatchWithMessageSource],
  );
}

function useProcessAndSendDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
) => Promise<void> {
  const processDMOps = useProcessDMOperation();
  const { sendDMOperation } = usePeerToPeerCommunication();

  return React.useCallback(
    async (dmOperationSpecification: DMOperationSpecification) => {
      await processDMOps(dmOperationSpecification.op);
      await sendDMOperation(dmOperationSpecification);
    },
    [processDMOps, sendDMOperation],
  );
}

export { useProcessDMOperation, useProcessAndSendDMOperation };
