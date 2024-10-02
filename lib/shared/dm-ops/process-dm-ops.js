// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { ProcessDMOperationUtilities } from './dm-op-spec.js';
import { dmOpSpecs } from './dm-op-specs.js';
import {
  type OutboundDMOperationSpecification,
  type DMOperationSpecification,
  useCreateMessagesToPeersFromDMOp,
  dmOperationSpecificationTypes,
  type OutboundComposableDMOperationSpecification,
  getThreadUpdatesForNewMessages,
  useSendDMOperationUtils,
} from './dm-op-utils.js';
import { useProcessBlobHolders } from '../../actions/holder-actions.js';
import { processNewUserIDsActionType } from '../../actions/user-actions.js';
import { useDispatchWithMetadata } from '../../hooks/ops-hooks.js';
import {
  usePeerToPeerCommunication,
  type ProcessOutboundP2PMessagesResult,
} from '../../tunnelbroker/peer-to-peer-context.js';
import {
  processDMOpsActionType,
  queueDMOpsActionType,
  dmOperationValidator,
} from '../../types/dm-ops.js';
import type { NotificationsCreationData } from '../../types/notif-types.js';
import type { DispatchMetadata } from '../../types/redux-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import { extractUserIDsFromPayload } from '../../utils/conversion-utils.js';
import { useSelector, useDispatch } from '../../utils/redux-utils.js';

function useProcessDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
  dmOpID: ?string,
) => Promise<void> {
  const baseUtilities = useSendDMOperationUtils();
  const dispatchWithMetadata = useDispatchWithMetadata();
  const processBlobHolders = useProcessBlobHolders();
  const createMessagesToPeersFromDMOp = useCreateMessagesToPeersFromDMOp();

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

      if (!dmOpSpecs[dmOp.type].operationValidator.is(dmOp)) {
        console.log(`Ignoring ${dmOp.type} operation because it is invalid`);
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

      const newUpdateInfos = getThreadUpdatesForNewMessages(
        rawMessageInfos,
        updateInfos,
        utilities,
      );

      updateInfos.push(...newUpdateInfos);

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
      processBlobHolders,
      dispatchWithMetadata,
      createMessagesToPeersFromDMOp,
      dispatch,
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

      const spec = dmOpSpecs[op.type];

      const notificationsCreationDataPromise: Promise<?NotificationsCreationData> =
        (async () => {
          if (!spec?.notificationsCreationData) {
            return null;
          }
          return await spec.notificationsCreationData(op, utilities);
        })();

      const [{ rawMessageInfos, updateInfos }, notificationsCreationData] =
        await Promise.all([
          dmOpSpecs[op.type].processDMOperation(op, utilities),
          notificationsCreationDataPromise,
        ]);

      const newUpdateInfos = getThreadUpdatesForNewMessages(
        rawMessageInfos,
        updateInfos,
        utilities,
      );

      dispatchWithMetadata(
        {
          type: processDMOpsActionType,
          payload: {
            rawMessageInfos: [],
            updateInfos: newUpdateInfos,
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
      baseUtilities,
      getDMOpsSendingPromise,
      localMessageInfos,
      createMessagesToPeersFromDMOp,
      dispatchWithMetadata,
      processOutboundMessages,
    ],
  );
}

export {
  useProcessDMOperation,
  useProcessAndSendDMOperation,
  useSendComposableDMOperation,
};
