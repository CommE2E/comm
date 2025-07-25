// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import {
  type DMOperationStoreOperation,
  addQueuedDMOpsToStore,
  removeQueuedDMOpsToStore,
} from '../ops/dm-operations-store-ops.js';
import {
  clearQueuedDMOpsActionType,
  type OperationsQueue,
  pruneDMOpsQueueActionType,
  type QueuedDMOperations,
  queueDMOpsActionType,
  reportUnshimmingOperationCompletedActionType,
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

    return {
      store: addQueuedDMOpsToStore(store, condition, operation, timestamp),
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
  } else if (action.type === clearQueuedDMOpsActionType) {
    const condition = action.payload;

    return {
      store: removeQueuedDMOpsToStore(store, condition),
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
  } else if (action.type === reportUnshimmingOperationCompletedActionType) {
    return {
      store: {
        ...store,
        shimmedOperations: store.shimmedOperations.filter(
          op => op.id !== action.payload.id,
        ),
      },
      operations: [
        {
          type: 'remove_dm_operations',
          payload: {
            ids: [action.payload.id],
          },
        },
      ],
    };
  }
  return { store, operations: [] };
}

export { reduceDMOperationsQueue };
