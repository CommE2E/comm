// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import type { ProcessDMOperationUtilities } from './dm-op-spec.js';
import { dmOpSpecs } from './dm-op-specs.js';
import {
  type OutboundDMOperationSpecification,
  type DMOperationSpecification,
  dmOperationSpecificationTypes,
  type OutboundComposableDMOperationSpecification,
} from './dm-op-types.js';
import {
  useCreateMessagesToPeersFromDMOp,
  useSendDMOperationUtils,
} from './dm-op-utils.js';
import { useProcessBlobHolders } from '../../actions/holder-actions.js';
import { processNewUserIDsActionType } from '../../actions/user-actions.js';
import { logTypes, useDebugLogs } from '../../components/debug-logs-context.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useDispatchWithMetadata } from '../../hooks/ops-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import {
  usePeerToPeerCommunication,
  type ProcessOutboundP2PMessagesResult,
} from '../../tunnelbroker/peer-to-peer-context.js';
import { useConfirmPeerToPeerMessage } from '../../tunnelbroker/use-confirm-peer-to-peer-message.js';
import {
  processDMOpsActionType,
  queueDMOpsActionType,
  dmOperationValidator,
  type ProcessDMOpsPayload,
  saveUnsupportedOperationActionType,
  queuedDMOperationConditionType,
} from '../../types/dm-ops.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { DispatchMetadata } from '../../types/redux-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { extractUserIDsFromPayload } from '../../utils/conversion-utils.js';
import { useSelector, useDispatch } from '../../utils/redux-utils.js';
import {
  type MessageNotifyType,
  messageNotifyTypes,
} from '../messages/message-spec.js';
import { messageSpecs } from '../messages/message-specs.js';

function useProcessDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
  dmOpID: ?string,
) => Promise<void> {
  const baseUtilities = useSendDMOperationUtils();
  const dispatchWithMetadata = useDispatchWithMetadata();
  const processBlobHolders = useProcessBlobHolders();
  const createMessagesToPeersFromDMOp = useCreateMessagesToPeersFromDMOp();
  const confirmPeerToPeerMessage = useConfirmPeerToPeerMessage();
  const getMessageNotifyTypes = useGetMessageNotifyTypes();

  const dispatch = useDispatch();

  const { addLog } = useDebugLogs();

  return React.useCallback(
    async (
      dmOperationSpecification: DMOperationSpecification,
      dmOpID: ?string,
    ) => {
      const { viewerID, ...restUtilities } = baseUtilities;
      if (!viewerID) {
        addLog(
          'Ignored DMOperation because logged out',
          JSON.stringify(dmOperationSpecification.op),
          new Set([logTypes.DM_OPS]),
        );
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

      if (!dmOpSpecs[dmOp.type]) {
        dispatchWithMetadata(
          {
            type: saveUnsupportedOperationActionType,
            payload: {
              operation: dmOp,
              id: uuid.v4(),
            },
          },
          dispatchMetadata,
        );
        addLog(
          "This operation type isn't supported by this code version",
          JSON.stringify(dmOp),
          new Set([logTypes.DM_OPS]),
        );
        return;
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
        const { notificationsCreationData } = await dmOpSpecs[
          dmOp.type
        ].processDMOperation(dmOp, utilities);

        const payload: ProcessDMOpsPayload = {
          rawMessageInfos: [],
          updateInfos: [],
          outboundP2PMessages,
          composableMessageID,
          notificationsCreationData,
          messagesNotifyTypes: {},
        };
        dispatchWithMetadata(
          {
            type: processDMOpsActionType,
            payload,
            dispatchSource: 'tunnelbroker',
          },
          dispatchMetadata,
        );

        return;
      }

      if (!dmOpSpecs[dmOp.type].operationValidator.is(dmOp)) {
        addLog(
          "Ignoring operation because it doesn't pass validation",
          JSON.stringify(dmOp),
          new Set([logTypes.ERROR, logTypes.DM_OPS]),
        );
        await confirmPeerToPeerMessage(dispatchMetadata);
        return;
      }

      const processingCheckResult = await dmOpSpecs[dmOp.type].canBeProcessed(
        dmOp,
        utilities,
      );

      if (!processingCheckResult.isProcessingPossible) {
        if (processingCheckResult.reason.type === 'invalid') {
          addLog(
            'Ignoring operation because it is invalid',
            JSON.stringify(dmOp),
            new Set([logTypes.ERROR, logTypes.DM_OPS]),
          );
          await confirmPeerToPeerMessage(dispatchMetadata);
          return;
        }
        let condition;
        if (processingCheckResult.reason.type === 'missing_thread') {
          condition = {
            type: queuedDMOperationConditionType.THREAD,
            threadID: processingCheckResult.reason.threadID,
          };
        } else if (processingCheckResult.reason.type === 'missing_entry') {
          condition = {
            type: queuedDMOperationConditionType.ENTRY,
            entryID: processingCheckResult.reason.entryID,
          };
        } else if (processingCheckResult.reason.type === 'missing_message') {
          condition = {
            type: queuedDMOperationConditionType.MESSAGE,
            messageID: processingCheckResult.reason.messageID,
          };
        } else if (processingCheckResult.reason.type === 'missing_membership') {
          condition = {
            type: queuedDMOperationConditionType.MEMBERSHIP,
            threadID: processingCheckResult.reason.threadID,
            userID: processingCheckResult.reason.userID,
          };
        }

        if (condition?.type) {
          addLog(
            `Adding operation to the ${condition.type} queue`,
            JSON.stringify(dmOp),
            new Set([logTypes.DM_OPS]),
          );
        } else {
          addLog(
            'Operation should be added to a queue but its type is missing',
            JSON.stringify(dmOp),
            new Set([logTypes.ERROR, logTypes.DM_OPS]),
          );
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

      const {
        rawMessageInfos,
        updateInfos,
        blobOps,
        notificationsCreationData,
      } = await dmOpSpecs[dmOp.type].processDMOperation(dmOp, utilities);

      const messagesNotifyTypes = await getMessageNotifyTypes(
        viewerID,
        rawMessageInfos,
        updateInfos,
      );

      const outboundNotificationsCreationData =
        dmOperationSpecification.type === dmOperationSpecificationTypes.OUTBOUND
          ? notificationsCreationData
          : null;

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

      const payload: ProcessDMOpsPayload = {
        rawMessageInfos,
        updateInfos,
        outboundP2PMessages,
        composableMessageID,
        notificationsCreationData: outboundNotificationsCreationData,
        messagesNotifyTypes,
      };
      dispatchWithMetadata(
        {
          type: processDMOpsActionType,
          payload,
          dispatchSource: 'tunnelbroker',
        },
        dispatchMetadata,
      );
    },
    [
      addLog,
      baseUtilities,
      processBlobHolders,
      dispatchWithMetadata,
      createMessagesToPeersFromDMOp,
      confirmPeerToPeerMessage,
      dispatch,
      getMessageNotifyTypes,
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
  const { getDMOpsSendingPromise } = usePeerToPeerCommunication();
  const dispatchWithMetadata = useDispatchWithMetadata();
  const baseUtilities = useSendDMOperationUtils();
  const { processOutboundMessages } = usePeerToPeerCommunication();
  const localMessageInfos = useSelector(state => state.messageStore.local);
  const createMessagesToPeersFromDMOp = useCreateMessagesToPeersFromDMOp();
  const getMessageNotifyTypes = useGetMessageNotifyTypes();

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
      );

      // There are no peer devices; the user is sending a message
      // in a thread with themselves and has only one device.
      if (outboundP2PMessages.length === 0) {
        return { result: 'success' };
      }

      const { rawMessageInfos, updateInfos, notificationsCreationData } =
        await dmOpSpecs[op.type].processDMOperation(op, utilities);

      const messagesNotifyTypes = await getMessageNotifyTypes(
        viewerID,
        rawMessageInfos,
        updateInfos,
      );

      const payload: ProcessDMOpsPayload = {
        rawMessageInfos,
        updateInfos,
        outboundP2PMessages,
        composableMessageID,
        notificationsCreationData,
        messagesNotifyTypes,
      };
      dispatchWithMetadata(
        {
          type: processDMOpsActionType,
          payload,
          dispatchSource: 'tunnelbroker',
        },
        { dmOpID },
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
      baseUtilities,
      getDMOpsSendingPromise,
      localMessageInfos,
      createMessagesToPeersFromDMOp,
      dispatchWithMetadata,
      processOutboundMessages,
      getMessageNotifyTypes,
    ],
  );
}

function useGetMessageNotifyTypes(): (
  viewerID: string,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
) => Promise<{ [messageID: string]: MessageNotifyType }> {
  const getLatestMessageEdit = useGetLatestMessageEdit();
  return React.useCallback(
    async (viewerID, rawMessageInfos, updateInfos) => {
      const { rawMessageInfos: allNewMessageInfos } =
        mergeUpdatesWithMessageInfos(rawMessageInfos, updateInfos);

      const messageNotifyTypePairPromises = allNewMessageInfos.map(
        async (rawMessageInfo: RawMessageInfo) => {
          const { id, type } = rawMessageInfo;
          invariant(id, 'Thick thread RawMessageInfos should always have ID');
          const { getMessageNotifyType } = messageSpecs[type];

          let messageNotifyType = messageNotifyTypes.SET_UNREAD;
          if (getMessageNotifyType) {
            messageNotifyType = await getMessageNotifyType(rawMessageInfo, {
              notifTargetUserID: viewerID,
              userNotMemberOfSubthreads: new Set(),
              fetchMessageInfoByID: getLatestMessageEdit,
            });
          }

          return [id, messageNotifyType];
        },
      );

      const messageNotifyTypePairs = await Promise.all(
        messageNotifyTypePairPromises,
      );
      return Object.fromEntries(messageNotifyTypePairs);
    },
    [getLatestMessageEdit],
  );
}

export {
  useProcessDMOperation,
  useProcessAndSendDMOperation,
  useSendComposableDMOperation,
};
