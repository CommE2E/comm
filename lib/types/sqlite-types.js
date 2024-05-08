// @flow

import type { StoreOperations } from './store-ops-types.js';

export type ReceivedMessageToDevice = {
  +messageID: string,
  +senderDeviceID: string,
  +plaintext: string,
  +status: string,
};

export type SQLiteAPI = {
  // read operations
  +getAllReceivedMessageToDevice: () => Promise<ReceivedMessageToDevice[]>,

  // write operations
  +removeReceivedMessagesToDevice: (
    ids: $ReadOnlyArray<string>,
  ) => Promise<void>,

  +processDBStoreOperations: (
    operations: StoreOperations,
    userID?: ?string,
  ) => Promise<void>,
};
