// @flow

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type { DBOpsStore } from '../types/db-ops-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceDBOpsStore(store: DBOpsStore, action: BaseAction): DBOpsStore {
  if (action.type === opsProcessingFinishedActionType) {
    const ids = new Set(action.payload.actionIDs);
    return {
      ...store,
      queuedOps: store.queuedOps.filter(
        ops => ops.opsID !== action.payload.opsID,
      ),
      noOpsActions: store.noOpsActions.filter(id => !ids.has(id)),
    };
  }
  return store;
}

export { reduceDBOpsStore };
