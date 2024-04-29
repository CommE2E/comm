// @flow

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type {
  MessageSourceMetadata,
  DBOpsStore,
} from '../types/db-ops-types.js';
import type { BaseAction } from '../types/redux-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { values } from '../utils/objects.js';

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

function queueDBOps(
  store: DBOpsStore,
  messageSourceMetadata: ?MessageSourceMetadata,
  ops: StoreOperations,
): DBOpsStore {
  const areNewOpsPresent = values(ops).some(opsArray => opsArray.length > 0);
  let newEntry = null;
  if (messageSourceMetadata && areNewOpsPresent) {
    newEntry = {
      messageSourceMetadata,
      ops,
    };
  } else if (areNewOpsPresent) {
    newEntry = {
      ops,
    };
  } else if (messageSourceMetadata) {
    newEntry = {
      messageSourceMetadata,
    };
  }

  if (!newEntry) {
    return store;
  }

  return {
    ...store,
    queuedOps: [...store.queuedOps, newEntry],
  };
}

export { reduceDBOpsStore, queueDBOps };
