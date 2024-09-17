// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import {
  clearQueuedThreadDMOpsActionType,
  type OperationsQueue,
  pruneDMOpsQueueActionType,
  type QueuedDMOperations,
  queueDMOpsActionType,
} from '../types/dm-ops.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceDMOperationsQueue(
  store: QueuedDMOperations,
  action: BaseAction,
): QueuedDMOperations {
  if (action.type === queueDMOpsActionType) {
    const { threadID, operation, timestamp } = action.payload;
    return {
      ...store,
      threadQueue: {
        ...store.threadQueue,
        [threadID]: [
          ...(store.threadQueue[threadID] ?? []),
          { operation, timestamp },
        ],
      },
    };
  } else if (action.type === pruneDMOpsQueueActionType) {
    const filterOperations = (queue: OperationsQueue) =>
      queue.filter(op => op.timestamp >= action.payload.pruneMaxTimestamp);
    return {
      ...store,
      threadQueue: _mapValues(operations => filterOperations(operations))(
        store.threadQueue,
      ),
      messageQueue: _mapValues(operations => filterOperations(operations))(
        store.messageQueue,
      ),
      entryQueue: _mapValues(operations => filterOperations(operations))(
        store.entryQueue,
      ),
      membershipQueue: _mapValues(threadMembershipQueue =>
        _mapValues(operations => filterOperations(operations))(
          threadMembershipQueue,
        ),
      )(store.membershipQueue),
    };
  } else if (action.type === clearQueuedThreadDMOpsActionType) {
    const { [action.payload.threadID]: removed, ...threadQueue } =
      store.threadQueue;
    return {
      ...store,
      threadQueue,
    };
  }
  return store;
}

export { reduceDMOperationsQueue };
