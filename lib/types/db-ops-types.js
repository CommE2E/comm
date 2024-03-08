// @flow

import type { StoreOperations } from './store-ops-types.js';

export type ActionID = string;

type DBOpsEntry = {
  +actionID: ActionID,
  +ops: StoreOperations,
};

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
  // This array stores actions that don't generate ops and can be immediately
  // completed.
  +noOpsActions: $ReadOnlyArray<ActionID>,
};

export type OpsProcessingFinishedPayload = {
  +actionIDs: $ReadOnlyArray<ActionID>,
};
