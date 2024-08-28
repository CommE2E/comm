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
import { useDispatchWithMetadata } from '../../hooks/ops-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import { getAllPeerUserIDAndDeviceIDs } from '../../selectors/user-selectors.js';
import { usePeerToPeerCommunication } from '../../tunnelbroker/peer-to-peer-context.js';
import {
  processDMOpsActionType,
  queueDMOpsActionType,
  sendDMActionTypes,
  type SendDMOpsSuccessPayload,
} from '../../types/dm-ops.js';
import type { LocalMessageInfo } from '../../types/message-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { DispatchMetadata } from '../../types/redux-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { useDispatchActionPromise } from '../../utils/redux-promise-utils.js';
import { useSelector } from '../../utils/redux-utils.js';
import { messageSpecs } from '../messages/message-specs.js';
import { updateSpecs } from '../updates/update-specs.js';

function useProcessDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
  dmOpID: ?string,
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

  const dispatchWithMetadata = useDispatchWithMetadata();
  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  const allPeerUserIDAndDeviceIDs = useSelector(getAllPeerUserIDAndDeviceIDs);
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  return React.useCallback(
    async (
      dmOperationSpecification: DMOperationSpecification,
      dmOpID: ?string,
    ) => {
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return;
      }

      const { op: dmOp } = dmOperationSpecification;

      let outboundP2PMessages: ?$ReadOnlyArray<OutboundP2PMessage> = null;
      if (
        dmOperationSpecification.type === dmOperationSpecificationTypes.OUTBOUND
      ) {
        outboundP2PMessages = await createMessagesToPeersFromDMOp(
          dmOperationSpecification,
          allPeerUserIDAndDeviceIDs,
          currentUserInfo,
          threadInfos,
        );
      }

      let dispatchMetadata: ?DispatchMetadata = null;
      if (
        dmOperationSpecification.type ===
          dmOperationSpecificationTypes.OUTBOUND &&
        dmOpID
      ) {
        dispatchMetadata = {
          dmOpID,
        };
      } else if (
        dmOperationSpecification.type === dmOperationSpecificationTypes.INBOUND
      ) {
        dispatchMetadata = dmOperationSpecification.metadata;
      }

      let messageIDWithoutAutoRetry: ?string = null;
      if (
        dmOperationSpecification.type ===
          dmOperationSpecificationTypes.OUTBOUND &&
        !dmOpSpecs[dmOp.type].supportsAutoRetry
      ) {
        messageIDWithoutAutoRetry = dmOp.messageID;
      }

      if (
        dmOperationSpecification.type ===
          dmOperationSpecificationTypes.OUTBOUND &&
        dmOperationSpecification.sendOnly
      ) {
        const notificationsCreationData = await dmOpSpecs[
          dmOp.type
        ].notificationsCreationData?.(dmOp, utilities);

        dispatchWithMetadata(
          {
            type: processDMOpsActionType,
            payload: {
              rawMessageInfos: [],
              updateInfos: [],
              outboundP2PMessages,
              messageIDWithoutAutoRetry,
              notificationsCreationData,
            },
          },
          dispatchMetadata,
        );

        return;
      }

      const processingCheckResult = dmOpSpecs[dmOp.type].canBeProcessed(
        dmOp,
        viewerID,
        utilities,
      );
      if (!processingCheckResult.isProcessingPossible) {
        if (processingCheckResult.reason.type === 'missing_thread') {
          dispatchWithMetadata(
            {
              type: queueDMOpsActionType,
              payload: {
                operation: dmOp,
                threadID: processingCheckResult.reason.threadID,
                timestamp: Date.now(),
              },
            },
            dispatchMetadata,
          );
        }
        return;
      }

      const dmOpSpec = dmOpSpecs[dmOp.type];
      const notificationsCreationDataPromise = (async () => {
        return await dmOpSpec.notificationsCreationData?.(dmOp, utilities);
      })();

      const [{ rawMessageInfos, updateInfos }, notificationsCreationData] =
        await Promise.all([
          dmOpSpec.processDMOperation(dmOp, viewerID, utilities),
          notificationsCreationDataPromise,
        ]);

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

      dispatchWithMetadata(
        {
          type: processDMOpsActionType,
          payload: {
            rawMessageInfos,
            updateInfos,
            outboundP2PMessages,
            messageIDWithoutAutoRetry,
            notificationsCreationData,
          },
        },
        dispatchMetadata,
      );
    },
    [
      viewerID,
      utilities,
      dispatchWithMetadata,
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
  const dispatchActionPromise = useDispatchActionPromise();
  const { getDMOpsSendingPromise } = usePeerToPeerCommunication();

  return React.useCallback(
    async (dmOperationSpecification: OutboundDMOperationSpecification) => {
      const { promise, dmOpID } = getDMOpsSendingPromise();
      await processDMOps(dmOperationSpecification, dmOpID);

      if (
        dmOperationSpecification.type ===
          dmOperationSpecificationTypes.OUTBOUND &&
        !dmOpSpecs[dmOperationSpecification.op.type].supportsAutoRetry &&
        dmOperationSpecification.op.messageID
      ) {
        const messageID: string = dmOperationSpecification.op.messageID;

        const sendingPromise: Promise<SendDMOpsSuccessPayload> = (async () => {
          const outboundP2PMessageIDs = await promise;
          return {
            messageID,
            outboundP2PMessageIDs,
          };
        })();

        void dispatchActionPromise(
          sendDMActionTypes,
          sendingPromise,
          undefined,
          {
            messageID,
          },
        );
      }
    },
    [dispatchActionPromise, getDMOpsSendingPromise, processDMOps],
  );
}

function useRetrySendDMOperation(): (
  messageID: string,
  localMessageInfo: LocalMessageInfo,
) => Promise<void> {
  const { processOutboundMessages, getDMOpsSendingPromise } =
    usePeerToPeerCommunication();
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async (messageID: string, localMessageInfo: LocalMessageInfo) => {
      const { promise, dmOpID } = getDMOpsSendingPromise();
      processOutboundMessages(localMessageInfo.outboundP2PMessageIDs, dmOpID);

      const sendingPromise: Promise<SendDMOpsSuccessPayload> = (async () => {
        const outboundP2PMessageIDs = await promise;
        return {
          messageID,
          outboundP2PMessageIDs,
        };
      })();
      void dispatchActionPromise(sendDMActionTypes, sendingPromise, undefined, {
        messageID,
      });
    },
    [dispatchActionPromise, getDMOpsSendingPromise, processOutboundMessages],
  );
}

export {
  useProcessDMOperation,
  useProcessAndSendDMOperation,
  useRetrySendDMOperation,
};
