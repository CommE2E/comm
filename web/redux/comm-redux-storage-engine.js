// @flow

import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

const commReduxStorageEngine = {
  getItem: async (key: string): Promise<string> => {
    const sharedWorker = await getCommSharedWorker();

    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.GET_PERSIST_STORAGE_ITEM,
      key,
    });
    if (!result || typeof result.item !== 'string') {
      throw new Error('Wrong type returned for storage item');
    }
    return result.item;
  },
  setItem: async (key: string, item: string): Promise<void> => {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM,
      key,
      item,
    });
  },
  removeItem: async (key: string): Promise<void> => {
    const sharedWorker = await getCommSharedWorker();

    await sharedWorker.schedule({
      type: workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM,
      key,
    });
  },
};

export default commReduxStorageEngine;
