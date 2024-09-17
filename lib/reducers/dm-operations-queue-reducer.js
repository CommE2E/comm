// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import {
  clearQueuedEntryDMOpsActionType,
  clearQueuedMembershipDMOpsActionType,
  clearQueuedMessageDMOpsActionType,
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
    const { condition, operation, timestamp } = action.payload;

    if (condition.type === 'thread') {
      return {
        ...store,
        threadQueue: {
          ...store.threadQueue,
          [condition.threadID]: [
            ...(store.threadQueue[condition.threadID] ?? []),
            { operation, timestamp },
          ],
        },
      };
    }

    if (condition.type === 'entry') {
      return {
        ...store,
        entryQueue: {
          ...store.entryQueue,
          [condition.entryID]: [
            ...(store.entryQueue[condition.entryID] ?? []),
            { operation, timestamp },
          ],
        },
      };
    }

    if (condition.type === 'message') {
      return {
        ...store,
        messageQueue: {
          ...store.messageQueue,
          [condition.messageID]: [
            ...(store.messageQueue[condition.messageID] ?? []),
            { operation, timestamp },
          ],
        },
      };
    }

    return {
      ...store,
      membershipQueue: {
        ...store.membershipQueue,
        [condition.threadID]: {
          ...(store.membershipQueue[condition.threadID] ?? {}),
          [condition.userID]: [
            ...(store.membershipQueue[condition.threadID]?.[condition.userID] ??
              []),
            { operation, timestamp },
          ],
        },
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
  } else if (action.type === clearQueuedMessageDMOpsActionType) {
    const { [action.payload.messageID]: removed, ...messageQueue } =
      store.messageQueue;
    return {
      ...store,
      messageQueue,
    };
  } else if (action.type === clearQueuedEntryDMOpsActionType) {
    const { [action.payload.entryID]: removed, ...entryQueue } =
      store.entryQueue;
    return {
      ...store,
      entryQueue,
    };
  } else if (action.type === clearQueuedMembershipDMOpsActionType) {
    const threadQueue = store.membershipQueue[action.payload.threadID];
    if (!threadQueue) {
      return store;
    }

    const { [action.payload.userID]: removed, ...queue } = threadQueue;
    if (Object.keys(queue).length === 0) {
      const { [action.payload.threadID]: removedThread, ...membershipQueue } =
        store.membershipQueue;
      return {
        ...store,
        membershipQueue,
      };
    }

    return {
      ...store,
      membershipQueue: {
        ...store.membershipQueue,
        [action.payload.userID]: queue,
      },
    };
  }
  return store;
}

export { reduceDMOperationsQueue };
