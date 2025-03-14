// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import type { DMOperationStoreOperation } from '../ops/dm-operations-store-ops.js';
import {
  clearQueuedEntryDMOpsActionType,
  clearQueuedMembershipDMOpsActionType,
  clearQueuedMessageDMOpsActionType,
  clearQueuedThreadDMOpsActionType,
  type OperationsQueue,
  pruneDMOpsQueueActionType,
  type QueuedDMOperations,
  queueDMOpsActionType,
  saveUnsupportedOperationActionType,
} from '../types/dm-ops.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceDMOperationsQueue(
  store: QueuedDMOperations,
  action: BaseAction,
): {
  +store: QueuedDMOperations,
  +operations: $ReadOnlyArray<DMOperationStoreOperation>,
} {
  if (action.type === queueDMOpsActionType) {
    const { condition, operation, timestamp } = action.payload;

    if (condition.type === 'thread') {
      return {
        store: {
          ...store,
          threadQueue: {
            ...store.threadQueue,
            [condition.threadID]: [
              ...(store.threadQueue[condition.threadID] ?? []),
              { operation, timestamp },
            ],
          },
        },
        operations: [],
      };
    }

    if (condition.type === 'entry') {
      return {
        store: {
          ...store,
          entryQueue: {
            ...store.entryQueue,
            [condition.entryID]: [
              ...(store.entryQueue[condition.entryID] ?? []),
              { operation, timestamp },
            ],
          },
        },
        operations: [],
      };
    }

    if (condition.type === 'message') {
      return {
        store: {
          ...store,
          messageQueue: {
            ...store.messageQueue,
            [condition.messageID]: [
              ...(store.messageQueue[condition.messageID] ?? []),
              { operation, timestamp },
            ],
          },
        },
        operations: [],
      };
    }

    return {
      store: {
        ...store,
        membershipQueue: {
          ...store.membershipQueue,
          [condition.threadID]: {
            ...(store.membershipQueue[condition.threadID] ?? {}),
            [condition.userID]: [
              ...(store.membershipQueue[condition.threadID]?.[
                condition.userID
              ] ?? []),
              { operation, timestamp },
            ],
          },
        },
      },
      operations: [],
    };
  } else if (action.type === pruneDMOpsQueueActionType) {
    const filterOperations = (queue: OperationsQueue) =>
      queue.filter(op => op.timestamp >= action.payload.pruneMaxTimestamp);
    return {
      store: {
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
      },
      operations: [],
    };
  } else if (action.type === clearQueuedThreadDMOpsActionType) {
    const { [action.payload.threadID]: removed, ...threadQueue } =
      store.threadQueue;
    return {
      store: {
        ...store,
        threadQueue,
      },
      operations: [],
    };
  } else if (action.type === clearQueuedMessageDMOpsActionType) {
    const { [action.payload.messageID]: removed, ...messageQueue } =
      store.messageQueue;
    return {
      store: {
        ...store,
        messageQueue,
      },
      operations: [],
    };
  } else if (action.type === clearQueuedEntryDMOpsActionType) {
    const { [action.payload.entryID]: removed, ...entryQueue } =
      store.entryQueue;
    return {
      store: {
        ...store,
        entryQueue,
      },
      operations: [],
    };
  } else if (action.type === clearQueuedMembershipDMOpsActionType) {
    const threadQueue = store.membershipQueue[action.payload.threadID];
    if (!threadQueue) {
      return { store, operations: [] };
    }

    const { [action.payload.userID]: removed, ...queue } = threadQueue;
    if (Object.keys(queue).length === 0) {
      const { [action.payload.threadID]: removedThread, ...membershipQueue } =
        store.membershipQueue;
      return {
        store: {
          ...store,
          membershipQueue,
        },
        operations: [],
      };
    }

    return {
      store: {
        ...store,
        membershipQueue: {
          ...store.membershipQueue,
          [action.payload.userID]: queue,
        },
      },
      operations: [],
    };
  } else if (action.type === saveUnsupportedOperationActionType) {
    return {
      store,
      operations: [
        {
          type: 'replace_dm_operation',
          payload: {
            id: action.payload.id,
            type: action.payload.operation.type,
            operation: action.payload.operation,
          },
        },
      ],
    };
  }
  return { store, operations: [] };
}

export { reduceDMOperationsQueue };
