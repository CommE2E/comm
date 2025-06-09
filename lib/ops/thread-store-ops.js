// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type {
  ClientDBThreadInfo,
  RawThreadInfos,
  ThreadStore,
} from '../types/thread-types.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from '../utils/thread-ops-utils.js';

export type RemoveThreadOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllThreadsOperation = {
  +type: 'remove_all',
};

export type ReplaceThreadOperation = {
  +type: 'replace',
  +payload: { +id: string, +threadInfo: RawThreadInfo, +isBackedUp: boolean },
};

export type ThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ReplaceThreadOperation;

export type ClientDBReplaceThreadOperation = {
  +type: 'replace',
  +payload: ClientDBThreadInfo,
};

export type ClientDBThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ClientDBReplaceThreadOperation;

export const threadStoreOpsHandlers: BaseStoreOpsHandlers<
  ThreadStore,
  ThreadStoreOperation,
  ClientDBThreadStoreOperation,
  RawThreadInfos,
  ClientDBThreadInfo,
> = {
  processStoreOperations(
    store: ThreadStore,
    ops: $ReadOnlyArray<ThreadStoreOperation>,
  ): ThreadStore {
    if (ops.length === 0) {
      return store;
    }
    let processedThreads = { ...store.threadInfos };
    for (const operation of ops) {
      if (operation.type === 'replace') {
        processedThreads[operation.payload.id] = operation.payload.threadInfo;
      } else if (operation.type === 'remove') {
        for (const id of operation.payload.ids) {
          delete processedThreads[id];
        }
      } else if (operation.type === 'remove_all') {
        processedThreads = {};
      }
    }
    return { ...store, threadInfos: processedThreads };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<ThreadStoreOperation>,
  ): $ReadOnlyArray<ClientDBThreadStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops.map(threadStoreOperation => {
      if (threadStoreOperation.type === 'replace') {
        return {
          type: 'replace',
          payload: convertRawThreadInfoToClientDBThreadInfo(
            threadStoreOperation.payload.threadInfo,
          ),
        };
      }
      return threadStoreOperation;
    });
  },

  translateClientDBData(data: $ReadOnlyArray<ClientDBThreadInfo>): {
    +[id: string]: RawThreadInfo,
  } {
    return Object.fromEntries(
      data.map((dbThreadInfo: ClientDBThreadInfo) => [
        dbThreadInfo.id,
        convertClientDBThreadInfoToRawThreadInfo(dbThreadInfo),
      ]),
    );
  },
};
