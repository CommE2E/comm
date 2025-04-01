// @flow

import type { ClientDBDMOperation } from 'lib/ops/dm-operations-store-ops.js';
import { convertStoreOperationsToClientDBStoreOperations } from 'lib/shared/redux/client-db-utils.js';
import type { IdentityAuthResult } from 'lib/types/identity-service-types.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type {
  SQLiteAPI,
  InboundP2PMessage,
  OutboundP2PMessage,
} from 'lib/types/sqlite-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import type { QRAuthBackupData } from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { entries, values } from 'lib/utils/objects.js';

import { getClientDBStore } from './store.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  async getAllInboundP2PMessages(): Promise<InboundP2PMessage[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_INBOUND_P2P_MESSAGES,
    });
    const messages: ?$ReadOnlyArray<InboundP2PMessage> =
      data?.inboundP2PMessages;
    return messages ? [...messages] : [];
  },

  async getInboundP2PMessagesByID(
    ids: $ReadOnlyArray<string>,
  ): Promise<Array<InboundP2PMessage>> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_INBOUND_P2P_MESSAGES_BY_ID,
      messageIDs: ids,
    });
    const messages: ?$ReadOnlyArray<InboundP2PMessage> =
      data?.inboundP2PMessages;
    return messages ? [...messages] : [];
  },

  async getUnsentOutboundP2PMessages(): Promise<OutboundP2PMessage[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_OUTBOUND_P2P_MESSAGES,
    });
    const messages: ?$ReadOnlyArray<OutboundP2PMessage> =
      data?.outboundP2PMessages;
    return messages ? [...messages] : [];
  },

  async getRelatedMessages(messageID: string): Promise<ClientDBMessageInfo[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_RELATED_MESSAGES,
      messageID,
    });
    const messages: ?$ReadOnlyArray<ClientDBMessageInfo> = data?.messages;
    return messages ? [...messages] : [];
  },

  async getOutboundP2PMessagesByID(
    ids: $ReadOnlyArray<string>,
  ): Promise<Array<OutboundP2PMessage>> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_OUTBOUND_P2P_MESSAGES_BY_ID,
      messageIDs: ids,
    });
    const messages: ?$ReadOnlyArray<OutboundP2PMessage> =
      data?.outboundP2PMessages;
    return messages ? [...messages] : [];
  },

  async searchMessages(
    query: string,
    threadID: string,
    timestampCursor: ?string,
    messageIDCursor: ?string,
  ): Promise<ClientDBMessageInfo[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.SEARCH_MESSAGES,
      query,
      threadID,
      timestampCursor,
      messageIDCursor,
    });
    const messages: ?$ReadOnlyArray<ClientDBMessageInfo> = data?.messages;
    return messages ? [...messages] : [];
  },

  async fetchMessages(
    threadID: string,
    limit: number,
    offset: number,
  ): Promise<ClientDBMessageInfo[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.FETCH_MESSAGES,
      threadID,
      limit,
      offset,
    });
    const messages: ?$ReadOnlyArray<ClientDBMessageInfo> = data?.messages;
    return messages ? [...messages] : [];
  },

  async fetchDMOperationsByType(
    type: string,
  ): Promise<Array<ClientDBDMOperation>> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_DM_OPERATIONS_BY_TYPE,
      operationType: type,
    });
    const operations = data?.operations;
    return operations ? [...operations] : [];
  },

  getClientDBStore,

  // write operations
  async removeInboundP2PMessages(ids: $ReadOnlyArray<string>): Promise<void> {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.REMOVE_INBOUND_P2P_MESSAGES,
      ids,
    });
  },

  async markOutboundP2PMessageAsSent(
    messageID: string,
    deviceID: string,
  ): Promise<void> {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.MARK_OUTBOUND_P2P_MESSAGE_AS_SENT,
      messageID,
      deviceID,
    });
  },

  async resetOutboundP2PMessagesForDevice(
    deviceID: string,
  ): Promise<Array<string>> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.RESET_OUTBOUND_P2P_MESSAGES,
      deviceID,
    });
    const messageIDs: ?$ReadOnlyArray<string> = data?.messageIDs;
    return messageIDs ? [...messageIDs] : [];
  },

  async removeOutboundP2PMessage(
    messageID: string,
    deviceID: string,
  ): Promise<void> {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.REMOVE_OUTBOUND_P2P_MESSAGE,
      messageID,
      deviceID,
    });
  },

  async processDBStoreOperations(
    storeOperations: StoreOperations,
  ): Promise<void> {
    const dbOps =
      convertStoreOperationsToClientDBStoreOperations(storeOperations);

    if (!values(dbOps).some(ops => ops && ops.length > 0)) {
      return;
    }

    const sharedWorker = await getCommSharedWorker();
    const isSupported = await sharedWorker.isSupported();
    if (!isSupported) {
      return;
    }
    try {
      await sharedWorker.schedule({
        type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
        storeOperations: dbOps,
      });
    } catch (e) {
      console.log(e);
      if (
        entries(storeOperations).some(
          ([key, ops]) =>
            key !== 'draftStoreOperations' &&
            key !== 'reportStoreOperations' &&
            ops.length > 0,
        )
      ) {
        await sharedWorker.init({ clearDatabase: true, markAsCorrupted: true });
        location.reload();
      }
    }
  },

  //backup
  async restoreUserData(
    qrAuthBackupData: QRAuthBackupData,
    identityAuthResult: IdentityAuthResult,
  ): Promise<void> {
    const { backupID, backupDataKey, backupLogDataKey } = qrAuthBackupData;
    const { userID, accessToken } = identityAuthResult;
    const [deviceID, sharedWorker] = await Promise.all([
      getContentSigningKey(),
      getCommSharedWorker(),
    ]);
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.BACKUP_RESTORE,
      authMetadata: {
        deviceID,
        userID,
        accessToken,
      },
      backupID,
      backupDataKey,
      backupLogDataKey,
    });
  },
};

export { sqliteAPI };
