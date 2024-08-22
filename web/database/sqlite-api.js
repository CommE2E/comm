// @flow

import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type {
  SQLiteAPI,
  InboundP2PMessage,
  OutboundP2PMessage,
} from 'lib/types/sqlite-types.js';

import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { processDBStoreOperations } from '../shared-worker/utils/store.js';
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

  processDBStoreOperations,
};

export { sqliteAPI };
