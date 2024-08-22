// @flow

import { type DispatchMetadata } from './redux-types.js';
import type { StoreOperations } from './store-ops-types.js';

export type DBOpsEntry =
  | {
      +dispatchMetadata: DispatchMetadata,
      +ops?: ?StoreOperations,
    }
  | {
      +ops: StoreOperations,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
