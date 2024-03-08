// @flow

import uuid from 'uuid';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type { ActionID, DBOpsStore } from '../types/db-ops-types.js';
import type { BaseAction } from '../types/redux-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { values } from '../utils/objects.js';

function reduceDBOpsStore(store: DBOpsStore, action: BaseAction): DBOpsStore {
  if (action.type === opsProcessingFinishedActionType) {
    const ids = new Set(action.payload.actionIDs);
    return {
      ...store,
      queuedOps: store.queuedOps.filter(ops => !ids.has(ops.actionID)),
      noOpsActions: store.noOpsActions.filter(id => !ids.has(id)),
    };
  }

  return store;
}

function queueDBOps(
  store: DBOpsStore,
  actionID: ?ActionID,
  ops: StoreOperations,
): DBOpsStore {
  const areNewOpsPresent = values(ops).some(opsArray => opsArray.length > 0);
  if (areNewOpsPresent) {
    store = {
      ...store,
      queuedOps: [
        ...store.queuedOps,
        {
          actionID: actionID ?? uuid.v4(),
          ops,
        },
      ],
    };
  } else if (actionID) {
    store = {
      ...store,
      noOpsActions: [...store.noOpsActions, actionID],
    };
  }
  return store;
}

export { reduceDBOpsStore, queueDBOps };
