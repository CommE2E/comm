// @flow

import type { NotificationsCreationData } from './notif-types.js';
import type { StoreOperations } from './store-ops-types.js';

export type MessageSourceMetadata = {
  +messageID: string,
  +senderDeviceID: string,
};

export type DBOpsEntry =
  | {
      +messageSourceMetadata: MessageSourceMetadata,
      +ops?: ?StoreOperations,
      +notificationsCreationData?: NotificationsCreationData,
    }
  | {
      +ops: StoreOperations,
      +dmOpID?: string,
      +notificationsCreationData?: NotificationsCreationData,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
