// @flow

import invariant from 'invariant';
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
import { processNewUserIDsActionType } from '../../actions/user-actions.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useDispatchWithMetadata } from '../../hooks/ops-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import { getAllPeerUserIDAndDeviceIDs } from '../../selectors/user-selectors.js';
import { usePeerToPeerCommunication } from '../../tunnelbroker/peer-to-peer-context.js';
import {
  processDMOpsActionType,
  queueDMOpsActionType,
  dmOperationValidator,
} from '../../types/dm-ops.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { DispatchMetadata } from '../../types/redux-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { extractUserIDsFromPayload } from '../../utils/conversion-utils.js';
import { useSelector, useDispatch } from '../../utils/redux-utils.js';
import { messageSpecs } from '../messages/message-specs.js';
import { updateSpecs } from '../updates/update-specs.js';

function useProcessDMOperation(): (
  dmOperationSpecification: DMOperationSpecification,
  dmOpID: ?string,
  localMessageID: ?string,
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

  const dispatch = useDispatch();

  return React.useCallback(
    async (
      dmOperationSpecification: DMOperationSpecification,
      dmOpID: ?string,
      localMessageID: ?string,
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
              //TODO rename to something descriptive
              messageIDWithoutAutoRetry: localMessageID,
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

      const newUserIDs = extractUserIDsFromPayload(dmOperationValidator, dmOp);
      if (newUserIDs.length > 0) {
        dispatch({
          type: processNewUserIDsActionType,
          payload: { userIDs: newUserIDs },
        });
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
        const updatedThreadInfo = threadInfo.minimallyEncoded
          ? {
              ...threadInfo,
              currentUser: {
                ...threadInfo.currentUser,
                unread: true,
              },
              timestamps: {
                ...threadInfo.timestamps,
                currentUser: {
                  ...threadInfo.timestamps.currentUser,
                  unread: time,
                },
              },
            }
          : {
              ...threadInfo,
              currentUser: {
                ...threadInfo.currentUser,
                unread: true,
              },
              timestamps: {
                ...threadInfo.timestamps,
                currentUser: {
                  ...threadInfo.timestamps.currentUser,
                  unread: time,
                },
              },
            };

        updateInfos.push({
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: updatedThreadInfo,
        });
      }

      dispatchWithMetadata(
        {
          type: processDMOpsActionType,
          payload: {
            rawMessageInfos,
            updateInfos,
            outboundP2PMessages,
            //TODO rename to something descriptive
            messageIDWithoutAutoRetry: localMessageID,
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
      dispatch,
    ],
  );
}

function useProcessAndSendDMOperation(): (
  dmOperationSpecification: OutboundDMOperationSpecification,
  localMessageID?: string,
) => Promise<$ReadOnlyArray<string>> {
  const processDMOps = useProcessDMOperation();
  const { getDMOpsSendingPromise } = usePeerToPeerCommunication();

  return React.useCallback(
    async (
      dmOperationSpecification: OutboundDMOperationSpecification,
      localMessageID?: string,
    ) => {
      // Creates promise that will be resolved when
      // Tunnelbroker will queue messages
      const { promise, dmOpID } = getDMOpsSendingPromise();
      // Processing DM Ops and generating messages to peers
      await processDMOps(dmOperationSpecification, dmOpID, localMessageID);
      // Returning promise, resolved after queuing messages
      return promise;
    },
    [getDMOpsSendingPromise, processDMOps],
  );
}

export { useProcessDMOperation, useProcessAndSendDMOperation };
