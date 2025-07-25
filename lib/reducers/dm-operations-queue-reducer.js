// @flow

import type { DMOperationStoreOperation } from '../ops/dm-operations-store-ops.js';
import { dmOperationsStoreOpsHandlers } from '../ops/dm-operations-store-ops.js';
import {
  clearQueuedDMOpsActionType,
  pruneDMOpsQueueActionType,
  type QueuedDMOperations,
  queueDMOpsActionType,
  reportUnshimmingOperationCompletedActionType,
  saveUnsupportedOperationActionType,
} from '../types/dm-ops.js';
import type { BaseAction } from '../types/redux-types.js';

const { processStoreOperations } = dmOperationsStoreOpsHandlers;

function reduceDMOperationsQueue(
  store: QueuedDMOperations,
  action: BaseAction,
): {
  +store: QueuedDMOperations,
  +operations: $ReadOnlyArray<DMOperationStoreOperation>,
} {
  if (action.type === queueDMOpsActionType) {
    const operations = [
      { type: 'add_queued_dm_operation', payload: action.payload },
    ];
    return {
      store: processStoreOperations(store, operations),
      operations,
    };
  } else if (action.type === pruneDMOpsQueueActionType) {
    const operations = [
      { type: 'prune_queued_dm_operations', payload: action.payload },
    ];
    return {
      store: processStoreOperations(store, operations),
      operations,
    };
  } else if (action.type === clearQueuedDMOpsActionType) {
    const operations = [
      {
        type: 'clear_dm_operations_queue',
        payload: { condition: action.payload },
      },
    ];
    return {
      store: processStoreOperations(store, operations),
      operations,
    };
  } else if (action.type === saveUnsupportedOperationActionType) {
    return {
      store,
      // Returning the original store, without modifying it, and
      // the DM Operation is saved directly to the database because
      // this client can't handle it. It can be retrieved later using
      // migration and unshimmed.
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
    const operations = [
      {
        type: 'remove_dm_operations',
        payload: {
          ids: [action.payload.id],
        },
      },
    ];
    return {
      store: processStoreOperations(store, operations),
      operations,
    };
  }
  return { store, operations: [] };
}

export { reduceDMOperationsQueue };
