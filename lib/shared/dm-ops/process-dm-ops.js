// @flow

import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import uuid from 'uuid';

import { dmOpSpecs } from './dm-op-specs.js';
import type {
  OutboundDMOperationSpecification,
  DMOperationSpecification,
} from './dm-op-utils.js';
import {
  createMessagesToPeersFromDMOp,
  dmOperationSpecificationTypes,
} from './dm-op-utils.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useDispatchWithMessageSource } from '../../hooks/ops-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import { getAllPeerUserIDAndDeviceIDs } from '../../selectors/user-selectors.js';
import { usePeerToPeerCommunication } from '../../tunnelbroker/peer-to-peer-context.js';
import {
  processDMOpsActionType,
  queueDMOpsActionType,
} from '../../types/dm-ops.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { useSelector } from '../../utils/redux-utils.js';
import { messageSpecs } from '../messages/message-specs.js';
import { updateSpecs } from '../updates/update-specs.js';

function useProcessDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
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
  const allPeerUserIDAndDeviceIDs = useSelector(getAllPeerUserIDAndDeviceIDs);
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  return React.useCallback(
    async (dmOperationSpecification: DMOperationSpecification) => {
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return;
      }

      let outboundP2PMessages: ?$ReadOnlyArray<OutboundP2PMessage> = null;
      if (
        dmOperationSpecification.type === dmOperationSpecificationTypes.OUTBOUND
      ) {
        outboundP2PMessages = await createMessagesToPeersFromDMOp(
          dmOperationSpecification,
          allPeerUserIDAndDeviceIDs,
          currentUserInfo,
        );
      }

      const { op: dmOp, metadata } = dmOperationSpecification;
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

      const updatedThreadInfosByThreadID: {
        [string]: RawThreadInfo | LegacyRawThreadInfo,
      } = {};
      for (const threadID in messagesByThreadID) {
        updatedThreadInfosByThreadID[threadID] = threadInfos[threadID];
      }
      for (const update of updateInfos) {
        const updatedThreadInfo = updateSpecs[
          update.type
        ].getUpdatedThreadInfo?.(update, updatedThreadInfosByThreadID);
        if (
          updatedThreadInfo &&
          updatedThreadInfo?.type === threadTypes.THICK_SIDEBAR
        ) {
          updatedThreadInfosByThreadID[updatedThreadInfo.id] =
            updatedThreadInfo;
        }
      }

      for (const threadID in messagesByThreadID) {
        const repliesCountIncreasingMessages = messagesByThreadID[
          threadID
        ].filter(message => messageSpecs[message.type].includedInRepliesCount);
        if (repliesCountIncreasingMessages.length > 0) {
          const threadInfo = updatedThreadInfosByThreadID[threadID];
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
            outboundP2PMessages,
          },
        },
        metadata,
      );
    },
    [
      viewerID,
      utilities,
      dispatchWithMessageSource,
      allPeerUserIDAndDeviceIDs,
      currentUserInfo,
      threadInfos,
    ],
  );
}

function useProcessAndSendDMOperation(): (
  dmOperationSpecification: OutboundDMOperationSpecification,
) => Promise<void> {
  const processDMOps = useProcessDMOperation();
  const { sendDMOperation } = usePeerToPeerCommunication();

  return React.useCallback(
    async (dmOperationSpecification: OutboundDMOperationSpecification) => {
      await processDMOps(dmOperationSpecification);
      await sendDMOperation(dmOperationSpecification);
    },
    [processDMOps, sendDMOperation],
  );
}

export { useProcessDMOperation, useProcessAndSendDMOperation };
