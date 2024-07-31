// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import {
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
    const { threadID, operation } = action.payload;
    return {
      ...store,
      operations: {
        ...store.operations,
        [threadID]: [...(store.operations[threadID] ?? []), operation],
      },
    };
  } else if (action.type === pruneDMOpsQueueActionType) {
    return {
      ...store,
      operations: _mapValues(operations =>
        operations.filter(op => op.time <= action.payload.pruneMaxTime),
      )(store.operations),
    };
  }
  return store;
}

export { reduceDMOperationsQueue };
