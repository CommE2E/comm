// @flow

import * as React from 'react';

import { dmOperationSpecificationTypes } from './dm-op-types.js';
import { useProcessDMOperation } from './process-dm-ops.js';
import { useActionsQueue } from '../../hooks/actions-queue.js';
import { messageInfoSelector } from '../../selectors/chat-selectors.js';
import {
  entryInfoSelector,
  threadInfoSelector,
} from '../../selectors/thread-selectors.js';
import {
  clearQueuedDMOpsActionType,
  pruneDMOpsQueueActionType,
  queuedDMOperationConditionType,
  reportUnshimmingOperationCompletedActionType,
} from '../../types/dm-ops.js';
import type { DMOperation } from '../../types/dm-ops.js';
import type { BaseAction } from '../../types/redux-types.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 60 * 60 * 1000;
const FIRST_PRUNING_DELAY = 10 * 60 * 1000;
const QUEUED_OPERATION_TTL = 3 * 24 * 60 * 60 * 1000;

type QueueItem =
  | {
      +type: 'operation',
      +operation: DMOperation,
    }
  | {
      +type: 'action',
      +action: BaseAction,
    }
  | {
      +type: 'function',
      +itemFunction: () => mixed,
    };

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

  const queuedThreadOperations = useSelector(
    state => state.queuedDMOperations.threadQueue,
  );

  const processDMOperation = useProcessDMOperation();

  const processItem = React.useCallback(
    async (item: QueueItem) => {
      if (item.type === 'operation') {
        await processDMOperation({
          // This is `INBOUND` because we assume that when generating
          // `dmOperationSpecificationTypes.OUBOUND` it should be possible
          // to be processed and never queued up.
          type: dmOperationSpecificationTypes.INBOUND,
          op: item.operation,
          // There is no metadata, because messages were confirmed when
          // adding to the queue.
          metadata: null,
        });
      } else if (item.type === 'action') {
        dispatch(item.action);
      } else {
        item.itemFunction();
      }
    },
    [dispatch, processDMOperation],
  );

  const { enqueue } = useActionsQueue(processItem);

  const runningThreadOperations = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    for (const threadID in queuedThreadOperations) {
      if (!threadInfos[threadID]) {
        continue;
      }

      if (runningThreadOperations.current.has(threadID)) {
        continue;
      }

      runningThreadOperations.current.add(threadID);

      enqueue([
        ...queuedThreadOperations[threadID].map(item => ({
          type: 'operation',
          operation: item.operation,
        })),
        {
          type: 'action',
          action: {
            type: clearQueuedDMOpsActionType,
            payload: {
              type: queuedDMOperationConditionType.THREAD,
              threadID,
            },
          },
        },
        {
          type: 'function',
          itemFunction: () => runningThreadOperations.current.delete(threadID),
        },
      ]);
    }
  }, [dispatch, enqueue, queuedThreadOperations, threadInfos]);

  const messageInfos = useSelector(messageInfoSelector);

  const queuedMessageOperations = useSelector(
    state => state.queuedDMOperations.messageQueue,
  );

  const runningMessageOperations = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    for (const messageID in queuedMessageOperations) {
      if (!messageInfos[messageID]) {
        continue;
      }

      if (runningMessageOperations.current.has(messageID)) {
        continue;
      }

      runningMessageOperations.current.add(messageID);

      enqueue([
        ...queuedMessageOperations[messageID].map(item => ({
          type: 'operation',
          operation: item.operation,
        })),
        {
          type: 'action',
          action: {
            type: clearQueuedDMOpsActionType,
            payload: {
              type: queuedDMOperationConditionType.MESSAGE,
              messageID,
            },
          },
        },
        {
          type: 'function',
          itemFunction: () =>
            runningMessageOperations.current.delete(messageID),
        },
      ]);
    }
  }, [dispatch, enqueue, messageInfos, queuedMessageOperations]);

  const entryInfos = useSelector(entryInfoSelector);

  const queuedEntryOperations = useSelector(
    state => state.queuedDMOperations.entryQueue,
  );

  const runningEntryOperations = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    for (const entryID in queuedEntryOperations) {
      if (!entryInfos[entryID]) {
        continue;
      }

      if (runningEntryOperations.current.has(entryID)) {
        continue;
      }

      runningEntryOperations.current.add(entryID);

      enqueue([
        ...queuedEntryOperations[entryID].map(item => ({
          type: 'operation',
          operation: item.operation,
        })),
        {
          type: 'action',
          action: {
            type: clearQueuedDMOpsActionType,
            payload: {
              type: queuedDMOperationConditionType.ENTRY,
              entryID,
            },
          },
        },
        {
          type: 'function',
          itemFunction: () => runningEntryOperations.current.delete(entryID),
        },
      ]);
    }
  }, [dispatch, enqueue, entryInfos, queuedEntryOperations]);

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

        enqueue([
          ...queuedMembershipOperations[threadID][member.id].map(item => ({
            type: 'operation',
            operation: item.operation,
          })),
          {
            type: 'action',
            action: {
              type: clearQueuedDMOpsActionType,
              payload: {
                type: queuedDMOperationConditionType.MEMBERSHIP,
                threadID,
                userID: member.id,
              },
            },
          },
          {
            type: 'function',
            itemFunction: () =>
              runningMembershipOperations.current
                .get(threadID)
                ?.delete(member.id),
          },
        ]);
      }
    }
  }, [dispatch, enqueue, queuedMembershipOperations, threadInfos]);

  const shimmedOperations = useSelector(
    state => state.queuedDMOperations.shimmedOperations,
  );
  const unshimmingStarted = React.useRef<boolean>(false);
  React.useEffect(() => {
    if (unshimmingStarted.current || shimmedOperations.length === 0) {
      return;
    }

    // We never set it to false to make sure we're unshimming only once
    unshimmingStarted.current = true;
    for (const operation of shimmedOperations) {
      enqueue([
        {
          type: 'operation',
          operation: operation.operation,
        },
        {
          type: 'action',
          action: {
            type: reportUnshimmingOperationCompletedActionType,
            payload: {
              id: operation.id,
            },
          },
        },
      ]);
    }
  }, [enqueue, shimmedOperations]);

  return null;
}

export { DMOpsQueueHandler };
