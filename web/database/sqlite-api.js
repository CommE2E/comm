// @flow

import type { SQLiteAPI, InboundP2PMessage } from 'lib/types/sqlite-types.js';

import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { processDBStoreOperations } from '../shared-worker/utils/store.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  async getAllInboundP2PMessage(): Promise<InboundP2PMessage[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_INBOUND_P2P_MESSAGES,
    });
    const messages: ?$ReadOnlyArray<InboundP2PMessage> = data?.messages;
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

  processDBStoreOperations,
};

export { sqliteAPI };
