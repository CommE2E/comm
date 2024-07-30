// @flow

import {
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
  }
  return store;
}

export { reduceDMOperationsQueue };
