// @flow

import type { StoreOperations } from './store-ops-types.js';

export type MessageID = string;

export type DBOpsEntry =
  | {
      +messageID: MessageID,
      +ops?: ?StoreOperations,
    }
  | {
      +ops: StoreOperations,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
