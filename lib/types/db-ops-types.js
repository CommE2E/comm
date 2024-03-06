// @flow

import type { StoreOperations } from './store-ops-types.js';

export type ActionID = string;

type DBOpsEntry = {
  +actionID: ActionID,
  +ops: ?StoreOperations,
};

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
