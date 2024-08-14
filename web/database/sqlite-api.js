// @flow

import { auxUserStoreOpsHandlers } from 'lib/ops/aux-user-store-ops.js';
import { communityStoreOpsHandlers } from 'lib/ops/community-store-ops.js';
import { entryStoreOpsHandlers } from 'lib/ops/entries-store-ops.js';
import { integrityStoreOpsHandlers } from 'lib/ops/integrity-store-ops.js';
import { keyserverStoreOpsHandlers } from 'lib/ops/keyserver-store-ops.js';
import { messageStoreOpsHandlers } from 'lib/ops/message-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { syncedMetadataStoreOpsHandlers } from 'lib/ops/synced-metadata-store-ops.js';
import { threadActivityStoreOpsHandlers } from 'lib/ops/thread-activity-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type {
  SQLiteAPI,
  InboundP2PMessage,
  OutboundP2PMessage,
} from 'lib/types/sqlite-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import { entries } from 'lib/utils/objects.js';

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

  async getAllOutboundP2PMessages(): Promise<OutboundP2PMessage[]> {
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

  async removeOutboundP2PMessagesOlderThan(
    messageID: string,
    deviceID: string,
  ): Promise<void> {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.REMOVE_OUTBOUND_P2P_MESSAGES,
      messageID,
      deviceID,
    });
  },

  async processDBStoreOperations(
    storeOperations: StoreOperations,
  ): Promise<void> {
    const {
      draftStoreOperations,
      threadStoreOperations,
      reportStoreOperations,
      keyserverStoreOperations,
      communityStoreOperations,
      integrityStoreOperations,
      syncedMetadataStoreOperations,
      auxUserStoreOperations,
      userStoreOperations,
      messageStoreOperations,
      threadActivityStoreOperations,
      outboundP2PMessages,
      entryStoreOperations,
      messageSearchStoreOperations,
    } = storeOperations;

    const convertedThreadStoreOperations =
      threadStoreOpsHandlers.convertOpsToClientDBOps(threadStoreOperations);
    const convertedReportStoreOperations =
      reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);
    const convertedKeyserverStoreOperations =
      keyserverStoreOpsHandlers.convertOpsToClientDBOps(
        keyserverStoreOperations,
      );
    const convertedCommunityStoreOperations =
      communityStoreOpsHandlers.convertOpsToClientDBOps(
        communityStoreOperations,
      );
    const convertedIntegrityStoreOperations =
      integrityStoreOpsHandlers.convertOpsToClientDBOps(
        integrityStoreOperations,
      );
    const convertedSyncedMetadataStoreOperations =
      syncedMetadataStoreOpsHandlers.convertOpsToClientDBOps(
        syncedMetadataStoreOperations,
      );
    const convertedAuxUserStoreOperations =
      auxUserStoreOpsHandlers.convertOpsToClientDBOps(auxUserStoreOperations);
    const convertedUserStoreOperations =
      userStoreOpsHandlers.convertOpsToClientDBOps(userStoreOperations);
    const convertedMessageStoreOperations =
      messageStoreOpsHandlers.convertOpsToClientDBOps(messageStoreOperations);
    const convertedThreadActivityStoreOperations =
      threadActivityStoreOpsHandlers.convertOpsToClientDBOps(
        threadActivityStoreOperations,
      );
    const convertedEntryStoreOperations =
      entryStoreOpsHandlers.convertOpsToClientDBOps(entryStoreOperations);

    if (
      convertedThreadStoreOperations.length === 0 &&
      convertedReportStoreOperations.length === 0 &&
      (!draftStoreOperations || draftStoreOperations.length === 0) &&
      convertedKeyserverStoreOperations.length === 0 &&
      convertedCommunityStoreOperations.length === 0 &&
      convertedIntegrityStoreOperations.length === 0 &&
      convertedSyncedMetadataStoreOperations.length === 0 &&
      convertedAuxUserStoreOperations.length === 0 &&
      convertedUserStoreOperations.length === 0 &&
      convertedMessageStoreOperations.length === 0 &&
      convertedThreadActivityStoreOperations.length === 0 &&
      convertedEntryStoreOperations.length === 0 &&
      outboundP2PMessages?.length === 0
    ) {
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
        storeOperations: {
          draftStoreOperations,
          reportStoreOperations: convertedReportStoreOperations,
          threadStoreOperations: convertedThreadStoreOperations,
          keyserverStoreOperations: convertedKeyserverStoreOperations,
          communityStoreOperations: convertedCommunityStoreOperations,
          integrityStoreOperations: convertedIntegrityStoreOperations,
          syncedMetadataStoreOperations: convertedSyncedMetadataStoreOperations,
          auxUserStoreOperations: convertedAuxUserStoreOperations,
          userStoreOperations: convertedUserStoreOperations,
          messageStoreOperations: convertedMessageStoreOperations,
          threadActivityStoreOperations: convertedThreadActivityStoreOperations,
          outboundP2PMessages,
          entryStoreOperations: convertedEntryStoreOperations,
          messageSearchStoreOperations,
        },
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
};

export { sqliteAPI };
