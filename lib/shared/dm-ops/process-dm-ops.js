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
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { useSelector } from '../../utils/redux-utils.js';
import { messageSpecs } from '../messages/message-specs.js';
import { updateSpecs } from '../updates/update-specs.js';

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

      const updatedThickSidebars = updateInfos
        .map(update => updateSpecs[update.type].getUpdatedThreadInfo?.(update))
        .filter(thread => thread?.type === threadTypes.THICK_SIDEBAR);
      const updatedThreadInfosByThreadID: {
        [string]: RawThreadInfo | LegacyRawThreadInfo,
      } = {};
      for (const threadInfo of updatedThickSidebars) {
        if (threadInfo?.id) {
          // We can have multiple thread infos with the same ID, and we want
          // to keep the last one.
          updatedThreadInfosByThreadID[threadInfo.id] = threadInfo;
        }
      }

      for (const threadID in messagesByThreadID) {
        const repliesCountIncreasingMessages = messagesByThreadID[
          threadID
        ].filter(message => messageSpecs[message.type].includedInRepliesCount);
        if (repliesCountIncreasingMessages.length > 0) {
          const threadInfo =
            updatedThreadInfosByThreadID[threadID] ?? threadInfos[threadID];
          const repliesCountIncreaseTime = Math.max(
            repliesCountIncreasingMessages.map(message => message.time),
          );
          updateInfos.push({
            type: updateTypes.UPDATE_THREAD,
            id: uuid.v4(),
            time: repliesCountIncreaseTime,
            threadInfo: {
              ...threadInfo,
              repliesCount:
                threadInfo.repliesCount + repliesCountIncreasingMessages.length,
            },
          });
        }

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
    [viewerID, utilities, dispatchWithMessageSource, threadInfos],
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
