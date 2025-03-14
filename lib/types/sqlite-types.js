// @flow

import type { ClientDBMessageInfo } from './message-types.js';
import type { StoreOperations } from './store-ops-types.js';
import type { ClientDBDMOperation } from '../ops/dm-operations-store-ops.js';

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
  +senderUserID: string,
};

export type OutboundP2PMessage = {
  +messageID: string,
  +deviceID: string,
  +userID: string,
  +timestamp: string,
  +plaintext: string,
  +ciphertext: string,
  +status: OutboundP2PMessageStatuses,
  +supportsAutoRetry: boolean,
};

export type SQLiteAPI = {
  // read operations
  +getAllInboundP2PMessages: () => Promise<Array<InboundP2PMessage>>,
  +getInboundP2PMessagesByID: (
    ids: $ReadOnlyArray<string>,
  ) => Promise<Array<InboundP2PMessage>>,
  +getUnsentOutboundP2PMessages: () => Promise<Array<OutboundP2PMessage>>,
  +getRelatedMessages: (
    messageID: string,
  ) => Promise<Array<ClientDBMessageInfo>>,
  +getOutboundP2PMessagesByID: (
    ids: $ReadOnlyArray<string>,
  ) => Promise<Array<OutboundP2PMessage>>,
  +searchMessages: (
    query: string,
    threadID: string,
    timestampCursor: ?string,
    messageIDCursor: ?string,
  ) => Promise<Array<ClientDBMessageInfo>>,
  +fetchMessages: (
    threadID: string,
    limit: number,
    offset: number,
  ) => Promise<Array<ClientDBMessageInfo>>,
  +fetchDMOperationsByType: (
    type: string,
  ) => Promise<Array<ClientDBDMOperation>>,

  // write operations
  +removeInboundP2PMessages: (ids: $ReadOnlyArray<string>) => Promise<void>,
  +markOutboundP2PMessageAsSent: (
    messageID: string,
    deviceID: string,
  ) => Promise<void>,
  +resetOutboundP2PMessagesForDevice: (
    deviceID: string,
  ) => Promise<Array<string>>,
  +removeOutboundP2PMessage: (
    messageID: string,
    deviceID: string,
  ) => Promise<void>,

  +processDBStoreOperations: (
    operations: StoreOperations,
    userID?: ?string,
  ) => Promise<void>,
};
