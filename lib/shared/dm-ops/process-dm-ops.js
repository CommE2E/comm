// @flow

import invariant from 'invariant';
import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import uuid from 'uuid';

import type { ProcessDMOperationUtilities } from './dm-op-spec.js';
import { dmOpSpecs } from './dm-op-specs.js';
import {
  type OutboundDMOperationSpecification,
  type DMOperationSpecification,
  createMessagesToPeersFromDMOp,
  dmOperationSpecificationTypes,
  type OutboundComposableDMOperationSpecification,
} from './dm-op-utils.js';
import { useProcessBlobHolders } from '../../actions/holder-actions.js';
import {
  processNewUserIDsActionType,
  useFindUserIdentities,
} from '../../actions/user-actions.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useDispatchWithMetadata } from '../../hooks/ops-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import { getAllPeerUserIDAndDeviceIDs } from '../../selectors/user-selectors.js';
import {
  usePeerToPeerCommunication,
  type ProcessOutboundP2PMessagesResult,
} from '../../tunnelbroker/peer-to-peer-context.js';
import {
  processDMOpsActionType,
  queueDMOpsActionType,
  dmOperationValidator,
} from '../../types/dm-ops.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotificationsCreationData } from '../../types/notif-types.js';
import type { DispatchMetadata } from '../../types/redux-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { extractUserIDsFromPayload } from '../../utils/conversion-utils.js';
import { useSelector, useDispatch } from '../../utils/redux-utils.js';
import { messageSpecs } from '../messages/message-specs.js';
import { updateSpecs } from '../updates/update-specs.js';

function useSendDMOperationUtils() {
  const fetchMessage = useGetLatestMessageEdit();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const entryInfos = useSelector(state => state.entryStore.entryInfos);
  const findUserIdentities = useFindUserIdentities();
  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  return React.useMemo(
    () => ({
      viewerID,
      fetchMessage,
      threadInfos,
      entryInfos,
      findUserIdentities,
    }),
    [viewerID, fetchMessage, threadInfos, entryInfos, findUserIdentities],
  );
}

function useProcessDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
  dmOpID: ?string,
) => Promise<void> {
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const baseUtilities = useSendDMOperationUtils();
  const dispatchWithMetadata = useDispatchWithMetadata();
  const allPeerUserIDAndDeviceIDs = useSelector(getAllPeerUserIDAndDeviceIDs);
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const processBlobHolders = useProcessBlobHolders();

  const dispatch = useDispatch();

  return React.useCallback(
    async (
      dmOperationSpecification: DMOperationSpecification,
      dmOpID: ?string,
    ) => {
      const { viewerID, ...restUtilities } = baseUtilities;
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return;
      }
      const utilities: ProcessDMOperationUtilities = {
        ...restUtilities,
        viewerID,
      };

      const { op: dmOp } = dmOperationSpecification;

      let outboundP2PMessages: ?$ReadOnlyArray<OutboundP2PMessage> = null;
      if (
        dmOperationSpecification.type === dmOperationSpecificationTypes.OUTBOUND
      ) {
        outboundP2PMessages = await createMessagesToPeersFromDMOp(
          dmOp,
          dmOperationSpecification.recipients,
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

      let composableMessageID: ?string = null;
      if (
        dmOperationSpecification.type ===
          dmOperationSpecificationTypes.OUTBOUND &&
        !dmOpSpecs[dmOp.type].supportsAutoRetry
      ) {
        composableMessageID = dmOp.messageID;
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
              composableMessageID,
              notificationsCreationData,
            },
          },
          dispatchMetadata,
        );

        return;
      }

      const processingCheckResult = await dmOpSpecs[dmOp.type].canBeProcessed(
        dmOp,
        utilities,
      );
      if (!processingCheckResult.isProcessingPossible) {
        if (processingCheckResult.reason.type === 'invalid') {
          return;
        }
        let condition;
        if (processingCheckResult.reason.type === 'missing_thread') {
          condition = {
            type: 'thread',
            threadID: processingCheckResult.reason.threadID,
          };
        } else if (processingCheckResult.reason.type === 'missing_entry') {
          condition = {
            type: 'entry',
            entryID: processingCheckResult.reason.entryID,
          };
        } else if (processingCheckResult.reason.type === 'missing_message') {
          condition = {
            type: 'message',
            messageID: processingCheckResult.reason.messageID,
          };
        } else if (processingCheckResult.reason.type === 'missing_membership') {
          condition = {
            type: 'membership',
            threadID: processingCheckResult.reason.threadID,
            userID: processingCheckResult.reason.userID,
          };
        }
        dispatchWithMetadata(
          {
            type: queueDMOpsActionType,
            payload: {
              operation: dmOp,
              timestamp: Date.now(),
              condition,
            },
          },
          dispatchMetadata,
        );
        return;
      }

      const newUserIDs = extractUserIDsFromPayload(dmOperationValidator, dmOp);
      if (newUserIDs.length > 0) {
        dispatch({
          type: processNewUserIDsActionType,
          payload: { userIDs: newUserIDs },
        });
      }

      const dmOpSpec = dmOpSpecs[dmOp.type];
      const notificationsCreationDataPromise: Promise<?NotificationsCreationData> =
        (async () => {
          if (
            dmOperationSpecification.type ===
              dmOperationSpecificationTypes.INBOUND ||
            !dmOpSpec.notificationsCreationData
          ) {
            return null;
          }
          return await dmOpSpec.notificationsCreationData(dmOp, utilities);
        })();

      const [
        { rawMessageInfos, updateInfos, blobOps },
        notificationsCreationData,
      ] = await Promise.all([
        dmOpSpec.processDMOperation(dmOp, utilities),
        notificationsCreationDataPromise,
      ]);

      const holderOps = blobOps
        .map(({ dmOpType, ...holderOp }) => {
          if (
            (dmOpType === 'inbound_only' &&
              dmOperationSpecification.type ===
                dmOperationSpecificationTypes.OUTBOUND) ||
            (dmOpType === 'outbound_only' &&
              dmOperationSpecification.type ===
                dmOperationSpecificationTypes.INBOUND)
          ) {
            return null;
          }
          return holderOp;
        })
        .filter(Boolean);
      void processBlobHolders(holderOps);

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
        if (updatedThreadInfo) {
          updatedThreadInfosByThreadID[updatedThreadInfo.id] =
            updatedThreadInfo;
        }
      }

      for (const threadID in messagesByThreadID) {
        const repliesCountIncreasingMessages = messagesByThreadID[
          threadID
        ].filter(message => messageSpecs[message.type].includedInRepliesCount);

        const threadInfo = updatedThreadInfosByThreadID[threadID];

        if (repliesCountIncreasingMessages.length > 0) {
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
        // We take the most recent timestamp to make sure that
        // change_thread_read_status operation older
        // than it won't flip the status to read.
        const time = Math.max(
          messagesFromOtherPeers.map(message => message.time),
        );
        invariant(threadInfo.thick, 'Thread should be thick');

        // We aren't checking if the unread timestamp is lower than the time.
        // We're doing this because we want to flip the thread to unread after
        // any new message from a non-viewer.
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID: threadInfo.id,
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
            composableMessageID,
            notificationsCreationData,
          },
        },
        dispatchMetadata,
      );
    },
    [
      baseUtilities,
      dispatchWithMetadata,
      allPeerUserIDAndDeviceIDs,
      currentUserInfo,
      threadInfos,
      dispatch,
      processBlobHolders,
    ],
  );
}

function useProcessAndSendDMOperation(): (
  dmOperationSpecification: OutboundDMOperationSpecification,
) => Promise<void> {
  const processDMOps = useProcessDMOperation();
  const { getDMOpsSendingPromise } = usePeerToPeerCommunication();

  return React.useCallback(
    async (dmOperationSpecification: OutboundDMOperationSpecification) => {
      const { promise, dmOpID } = getDMOpsSendingPromise();
      await processDMOps(dmOperationSpecification, dmOpID);
      await promise;
    },
    [getDMOpsSendingPromise, processDMOps],
  );
}

function useSendComposableDMOperation(): (
  dmOperationSpecification: OutboundComposableDMOperationSpecification,
) => Promise<ProcessOutboundP2PMessagesResult> {
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const { getDMOpsSendingPromise } = usePeerToPeerCommunication();
  const dispatchWithMetadata = useDispatchWithMetadata();
  const allPeerUserIDAndDeviceIDs = useSelector(getAllPeerUserIDAndDeviceIDs);
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const baseUtilities = useSendDMOperationUtils();
  const { processOutboundMessages } = usePeerToPeerCommunication();
  const localMessageInfos = useSelector(state => state.messageStore.local);

  return React.useCallback(
    async (
      dmOperationSpecification: OutboundComposableDMOperationSpecification,
    ): Promise<ProcessOutboundP2PMessagesResult> => {
      const { viewerID, ...restUtilities } = baseUtilities;
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return {
          result: 'failure',
          failedMessageIDs: [],
        };
      }
      const utilities: ProcessDMOperationUtilities = {
        ...restUtilities,
        viewerID,
      };

      const { promise, dmOpID } = getDMOpsSendingPromise();

      const { op, composableMessageID, recipients } = dmOperationSpecification;

      const localMessageInfo = localMessageInfos[composableMessageID];
      if (
        localMessageInfo?.outboundP2PMessageIDs &&
        localMessageInfo.outboundP2PMessageIDs.length > 0
      ) {
        processOutboundMessages(localMessageInfo.outboundP2PMessageIDs, dmOpID);
        try {
          // This code should never throw.
          return await promise;
        } catch (e) {
          invariant(
            localMessageInfo.outboundP2PMessageIDs,
            'outboundP2PMessageIDs should be defined',
          );
          return {
            result: 'failure',
            failedMessageIDs: localMessageInfo.outboundP2PMessageIDs,
          };
        }
      }

      const outboundP2PMessages = await createMessagesToPeersFromDMOp(
        op,
        recipients,
        allPeerUserIDAndDeviceIDs,
        currentUserInfo,
        threadInfos,
      );

      const notificationsCreationData = await dmOpSpecs[
        op.type
      ].notificationsCreationData?.(op, utilities);

      dispatchWithMetadata(
        {
          type: processDMOpsActionType,
          payload: {
            rawMessageInfos: [],
            updateInfos: [],
            outboundP2PMessages,
            composableMessageID,
            notificationsCreationData,
          },
        },
        {
          dmOpID,
        },
      );

      try {
        // This code should never throw.
        return await promise;
      } catch (e) {
        return {
          result: 'failure',
          failedMessageIDs: outboundP2PMessages.map(
            message => message.messageID,
          ),
        };
      }
    },
    [
      allPeerUserIDAndDeviceIDs,
      currentUserInfo,
      dispatchWithMetadata,
      getDMOpsSendingPromise,
      localMessageInfos,
      processOutboundMessages,
      threadInfos,
      baseUtilities,
    ],
  );
}

export {
  useProcessDMOperation,
  useProcessAndSendDMOperation,
  useSendComposableDMOperation,
};
