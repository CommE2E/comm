// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import {
  clearDMOpsThreadQueueActionType,
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
      operations: {
        ...store.operations,
        [threadID]: [
          ...(store.operations[threadID] ?? []),
          { operation, timestamp },
        ],
      },
    };
  } else if (action.type === pruneDMOpsQueueActionType) {
    return {
      ...store,
      operations: _mapValues(operations =>
        operations.filter(op => op.timestamp >= action.payload.pruneMaxTime),
      )(store.operations),
    };
  } else if (action.type === clearDMOpsThreadQueueActionType) {
    const { [action.payload.threadID]: removed, ...operations } =
      store.operations;
    return {
      ...store,
      operations,
    };
  }
  return store;
}

export { reduceDMOperationsQueue };
