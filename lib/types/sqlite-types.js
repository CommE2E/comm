// @flow

import type { StoreOperations } from './store-ops-types.js';

export type InboundP2PMessage = {
  +messageID: string,
  +senderDeviceID: string,
  +plaintext: string,
  +status: string,
};

export type OutboundP2PMessage = {
  +messageID: string,
  +deviceID: string,
  +userID: string,
  +timestamp: string,
  +plaintext: string,
  +ciphertext: string,
};

export type SQLiteAPI = {
  // read operations
  +getAllInboundP2PMessage: () => Promise<InboundP2PMessage[]>,

  // write operations
  +removeInboundP2PMessages: (ids: $ReadOnlyArray<string>) => Promise<void>,

  +processDBStoreOperations: (
    operations: StoreOperations,
    userID?: ?string,
  ) => Promise<void>,
};
