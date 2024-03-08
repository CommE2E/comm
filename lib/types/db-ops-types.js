// @flow

import type { StoreOperations } from './store-ops-types.js';

export type ActionID = number;

type DBOpsEntry = {
  +actionID: ?ActionID,
  +ops: $Partial<StoreOperations>,
};

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
  +noOpsActions: $ReadOnlyArray<ActionID>,
};

export type OpsProcessingFinishedPayload = {
  +actionIDs: $ReadOnlyArray<ActionID>,
};
