// @flow

import * as React from 'react';

import { dmOperationSpecificationTypes } from './dm-op-utils.js';
import { useProcessDMOperation } from './process-dm-ops.js';
import { messageInfoSelector } from '../../selectors/chat-selectors.js';
import {
  entryInfoSelector,
  threadInfoSelector,
} from '../../selectors/thread-selectors.js';
import {
  clearQueuedEntryDMOpsActionType,
  clearQueuedMembershipDMOpsActionType,
  clearQueuedMessageDMOpsActionType,
  clearQueuedThreadDMOpsActionType,
  pruneDMOpsQueueActionType,
} from '../../types/dm-ops.js';
import type { OperationsQueue } from '../../types/dm-ops.js';
import { threadTypeIsThick } from '../../types/thread-types-enum.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 60 * 60 * 1000;
const FIRST_PRUNING_DELAY = 10 * 60 * 1000;
const QUEUED_OPERATION_TTL = 3 * 24 * 60 * 60 * 1000;

function DMOpsQueueHandler(): React.Node {
  const dispatch = useDispatch();

  const prune = React.useCallback(() => {
    const now = Date.now();
    dispatch({
      type: pruneDMOpsQueueActionType,
      payload: {
        pruneMaxTimestamp: now - QUEUED_OPERATION_TTL,
      },
    });
  }, [dispatch]);

  React.useEffect(() => {
    const timeoutID = setTimeout(prune, FIRST_PRUNING_DELAY);
    const intervalID = setInterval(prune, PRUNING_FREQUENCY);

    return () => {
      clearTimeout(timeoutID);
      clearInterval(intervalID);
    };
  }, [prune]);

  const threadInfos = useSelector(threadInfoSelector);
  const threadIDs = React.useMemo(
    () =>
      new Set(
        Object.entries(threadInfos)
          .filter(([, threadInfo]) => threadTypeIsThick(threadInfo.type))
          .map(([id]) => id),
      ),
    [threadInfos],
  );
  const prevThreadIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedThreadOperations = useSelector(
    state => state.queuedDMOperations.threadQueue,
  );

  const processDMOperation = useProcessDMOperation();
  const processOperationsQueue = React.useCallback(
    (queue: OperationsQueue) => {
      for (const dmOp of queue) {
        void processDMOperation({
          // This is `INBOUND` because we assume that when generating
          // `dmOperationSpecificationTypes.OUBOUND` it should be possible
          // to be processed and never queued up.
          type: dmOperationSpecificationTypes.INBOUND,
          op: dmOp.operation,
          // There is no metadata, because messages were confirmed when
          // adding to the queue.
          metadata: null,
        });
      }
    },
    [processDMOperation],
  );

  React.useEffect(() => {
    const prevThreadIDs = prevThreadIDsRef.current;
    prevThreadIDsRef.current = threadIDs;

    for (const threadID in queuedThreadOperations) {
      if (!threadIDs.has(threadID) || prevThreadIDs.has(threadID)) {
        continue;
      }
      processOperationsQueue(queuedThreadOperations[threadID]);
      dispatch({
        type: clearQueuedThreadDMOpsActionType,
        payload: {
          threadID,
        },
      });
    }
  }, [dispatch, processOperationsQueue, queuedThreadOperations, threadIDs]);

  const messageInfos = useSelector(messageInfoSelector);
  const messageIDs = React.useMemo(
    () =>
      new Set(
        Object.entries(messageInfos)
          .filter(
            ([, messageInfo]) =>
              messageInfo &&
              threadTypeIsThick(threadInfos[messageInfo.threadID]?.type),
          )
          .map(([id]) => id),
      ),
    [messageInfos, threadInfos],
  );
  const prevMessageIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedMessageOperations = useSelector(
    state => state.queuedDMOperations.messageQueue,
  );

  React.useEffect(() => {
    const prevMessageIDs = prevMessageIDsRef.current;
    prevMessageIDsRef.current = messageIDs;

    for (const messageID in queuedMessageOperations) {
      if (!messageIDs.has(messageID) || prevMessageIDs.has(messageID)) {
        continue;
      }
      processOperationsQueue(queuedMessageOperations[messageID]);
      dispatch({
        type: clearQueuedMessageDMOpsActionType,
        payload: {
          messageID,
        },
      });
    }
  }, [dispatch, messageIDs, processOperationsQueue, queuedMessageOperations]);

  const entryInfos = useSelector(entryInfoSelector);
  const entryIDs = React.useMemo(
    () =>
      new Set(
        Object.entries(entryInfos)
          .filter(([, entryInfo]) =>
            threadTypeIsThick(threadInfos[entryInfo.threadID]?.type),
          )
          .map(([id]) => id),
      ),
    [entryInfos, threadInfos],
  );
  const prevEntryIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedEntryOperations = useSelector(
    state => state.queuedDMOperations.entryQueue,
  );

  React.useEffect(() => {
    const prevEntryIDs = prevEntryIDsRef.current;
    prevEntryIDsRef.current = entryIDs;

    for (const entryID in queuedEntryOperations) {
      if (!entryIDs.has(entryID) || prevEntryIDs.has(entryID)) {
        continue;
      }
      processOperationsQueue(queuedEntryOperations[entryID]);
      dispatch({
        type: clearQueuedEntryDMOpsActionType,
        payload: {
          entryID,
        },
      });
    }
  }, [dispatch, entryIDs, processOperationsQueue, queuedEntryOperations]);

  const queuedMembershipOperations = useSelector(
    state => state.queuedDMOperations.membershipQueue,
  );

  const runningMembershipOperations = React.useRef<Map<string, Set<string>>>(
    new Map(),
  );
  React.useEffect(() => {
    for (const threadID in queuedMembershipOperations) {
      if (!threadInfos[threadID]) {
        continue;
      }

      const queuedMemberIDs = new Set(
        Object.keys(queuedMembershipOperations[threadID]),
      );
      if (!runningMembershipOperations.current.has(threadID)) {
        runningMembershipOperations.current.set(threadID, new Set());
      }
      for (const member of threadInfos[threadID].members) {
        if (
          !queuedMemberIDs.has(member.id) ||
          runningMembershipOperations.current.get(threadID)?.has(member.id)
        ) {
          continue;
        }

        runningMembershipOperations.current.get(threadID)?.add(member.id);

        processOperationsQueue(queuedMembershipOperations[threadID][member.id]);

        dispatch({
          type: clearQueuedMembershipDMOpsActionType,
          payload: {
            threadID,
            userID: member.id,
          },
        });
        runningMembershipOperations.current.get(threadID)?.delete(member.id);
      }
    }
  }, [
    dispatch,
    processOperationsQueue,
    queuedMembershipOperations,
    threadInfos,
  ]);

  return null;
}

export { DMOpsQueueHandler };
