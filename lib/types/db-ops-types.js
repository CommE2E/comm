// @flow

import type { StoreOperations } from './store-ops-types.js';

export type MessageSourceMetadata = {
  +messageID: string,
  +senderDeviceID: string,
};

export type DBOpsEntry =
  | {
      +messageSourceMetadata: MessageSourceMetadata,
      +ops?: ?StoreOperations,
    }
  | {
      +ops: StoreOperations,
      +dmID?: string,
    };

export type DBOpsStore = {
  +queuedOps: $ReadOnlyArray<DBOpsEntry>,
};
