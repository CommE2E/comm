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
  const prevThreadInfosRef = React.useRef({});

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
    const prevThreadInfos = prevThreadInfosRef.current;
    prevThreadInfosRef.current = threadInfos;

    for (const threadID in queuedThreadOperations) {
      if (!threadInfos[threadID] || prevThreadInfos[threadID]) {
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
  }, [dispatch, processOperationsQueue, queuedThreadOperations, threadInfos]);

  const messageInfos = useSelector(messageInfoSelector);
  const prevMessageInfosRef = React.useRef({});

  const queuedMessageOperations = useSelector(
    state => state.queuedDMOperations.messageQueue,
  );

  React.useEffect(() => {
    const prevMessageInfos = prevMessageInfosRef.current;
    prevMessageInfosRef.current = messageInfos;

    for (const messageID in queuedMessageOperations) {
      if (!messageInfos[messageID] || prevMessageInfos[messageID]) {
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
  }, [dispatch, messageInfos, processOperationsQueue, queuedMessageOperations]);

  const entryInfos = useSelector(entryInfoSelector);
  const prevEntryInfosRef = React.useRef({});

  const queuedEntryOperations = useSelector(
    state => state.queuedDMOperations.entryQueue,
  );

  React.useEffect(() => {
    const prevEntryInfos = prevEntryInfosRef.current;
    prevEntryInfosRef.current = entryInfos;

    for (const entryID in queuedEntryOperations) {
      if (!entryInfos[entryID] || prevEntryInfos[entryID]) {
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
  }, [dispatch, entryInfos, processOperationsQueue, queuedEntryOperations]);

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
