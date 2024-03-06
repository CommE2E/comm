// @flow

import type { StoreOperations } from './store-ops-types.js';

type DBOpsEntry = {
  +actionID: number,
  +ops: StoreOperations,
};

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
  +noOpsActions: $ReadOnlyArray<number>,
};
