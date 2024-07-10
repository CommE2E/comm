// @flow

import type { StoreOperations } from './store-ops-types.js';

export const outboundP2PMessageStatuses = Object.freeze({
  // The message was prepared to be sent to other peers, but it's not encrypted.
  // It was inserted into DB in the same transaction as making changes to
  // the store.
  persisted: 'persisted',
  // Encryption is done in the same transaction as persisting the CryptoModule,
  // and message order is also tracked on the client side,
  // which means the message can be sent.
  encrypted: 'encrypted',
  // The message was sent to another peer (Tunnelbroker owns it),
  // waiting for the confirmation (handled in `peerToPeerMessageHandler`).
  sent: 'sent',
});
export type OutboundP2PMessageStatuses = $Values<
  typeof outboundP2PMessageStatuses,
>;

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
  +status: OutboundP2PMessageStatuses,
  +automaticallyRetried: string,
};

export type SQLiteAPI = {
  // read operations
  +getAllInboundP2PMessage: () => Promise<InboundP2PMessage[]>,
  +getAllOutboundP2PMessage: () => Promise<OutboundP2PMessage[]>,
  +getOutboundP2PMessagesByID: (
    ids: $ReadOnlyArray<string>,
  ) => Promise<$ReadOnlyArray<OutboundP2PMessage>>,

  // write operations
  +removeInboundP2PMessages: (ids: $ReadOnlyArray<string>) => Promise<void>,
  +markOutboundP2PMessageAsSent: (
    messageID: string,
    deviceID: string,
  ) => Promise<void>,
  +removeOutboundP2PMessagesOlderThan: (
    messageID: string,
    deviceID: string,
  ) => Promise<void>,

  +processDBStoreOperations: (
    operations: StoreOperations,
    userID?: ?string,
  ) => Promise<void>,
};
