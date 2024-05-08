// @flow

import type {
  SQLiteAPI,
  ReceivedMessageToDevice,
} from 'lib/types/sqlite-types.js';

import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { processDBStoreOperations } from '../shared-worker/utils/store.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

const sqliteAPI: SQLiteAPI = {
  // read operations
  async getAllReceivedMessageToDevice(): Promise<ReceivedMessageToDevice[]> {
    const sharedWorker = await getCommSharedWorker();

    const data = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_RECEIVED_MESSAGES_TO_DEVICE,
    });
    const messages: ?$ReadOnlyArray<ReceivedMessageToDevice> = data?.messages;
    return messages ? [...messages] : [];
  },

  // write operations
  async removeReceivedMessagesToDevice(
    ids: $ReadOnlyArray<string>,
  ): Promise<void> {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.REMOVE_RECEIVED_MESSAGES_TO_DEVICE,
      ids,
    });
  },

  processDBStoreOperations,
};

export { sqliteAPI };
