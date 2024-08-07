// @flow

import type { NotificationsCreationData } from './notif-types.js';
import { type DispatchMetadata } from './redux-types.js';
import type { StoreOperations } from './store-ops-types.js';

export type DBOpsEntry =
  | {
      +dispatchMetadata: DispatchMetadata,
      +ops?: ?StoreOperations,
      +notificationsCreationData?: NotificationsCreationData,
    }
  | {
      +ops: StoreOperations,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
