// @flow

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type { DBOpsStore } from '../types/db-ops-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceDBOpsStore(store: DBOpsStore, action: BaseAction): DBOpsStore {
  if (action.type === opsProcessingFinishedActionType) {
    const [, ...rest] = store.queuedOps;
    return {
      ...store,
      queuedOps: rest,
    };
  }
  return store;
}

export { reduceDBOpsStore };
