// @flow

import type { StoreOperations } from './store-ops-types.js';

export type MessageData = {
  messageID: string,
  senderDeviceID: string,
};

export type DBOpsEntry =
  | {
      +messageData: MessageData,
      +ops?: ?StoreOperations,
    }
  | {
      +ops: StoreOperations,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
