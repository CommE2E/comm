// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import { getDataIsBackedUpByThread } from '../shared/threads/protocols/thread-protocols.js';
import type {
  ThreadActivityStore,
  ThreadActivityStoreEntry,
} from '../types/thread-activity-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';

// client types
export type ReplaceThreadActivityEntryOperation = {
  +type: 'replace_thread_activity_entry',
  +payload: {
    +id: string,
    +threadActivityStoreEntry: ThreadActivityStoreEntry,
    +isBackedUp: boolean,
  },
};

export type RemoveThreadActivityEntriesOperation = {
  +type: 'remove_thread_activity_entries',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllThreadActivityEntriesOperation = {
  +type: 'remove_all_thread_activity_entries',
};

export type ThreadActivityStoreOperation =
  | ReplaceThreadActivityEntryOperation
  | RemoveThreadActivityEntriesOperation
  | RemoveAllThreadActivityEntriesOperation;

// SQLite types
export type ClientDBThreadActivityEntry = {
  +id: string,
  +threadActivityStoreEntry: string,
};

export type ClientDBReplaceThreadActivityEntryOperation = {
  +type: 'replace_thread_activity_entry',
  +payload: ClientDBThreadActivityEntry,
  +isBackedUp: boolean,
};

export type ClientDBThreadActivityStoreOperation =
  | ClientDBReplaceThreadActivityEntryOperation
  | RemoveThreadActivityEntriesOperation
  | RemoveAllThreadActivityEntriesOperation;

function convertThreadActivityEntryToClientDBThreadActivityEntry({
  id,
  threadActivityStoreEntry,
}: {
  +id: string,
  +threadActivityStoreEntry: ThreadActivityStoreEntry,
}): ClientDBThreadActivityEntry {
  return {
    id,
    threadActivityStoreEntry: JSON.stringify(threadActivityStoreEntry),
  };
}

const threadActivityStoreOpsHandlers: BaseStoreOpsHandlers<
  ThreadActivityStore,
  ThreadActivityStoreOperation,
  ClientDBThreadActivityStoreOperation,
  ThreadActivityStore,
  ClientDBThreadActivityEntry,
> = {
  processStoreOperations(
    threadActivityStore: ThreadActivityStore,
    ops: $ReadOnlyArray<ThreadActivityStoreOperation>,
  ): ThreadActivityStore {
    if (ops.length === 0) {
      return threadActivityStore;
    }

    let processedThreadActivityStore = threadActivityStore;

    for (const operation: ThreadActivityStoreOperation of ops) {
      if (operation.type === 'replace_thread_activity_entry') {
        const { id, threadActivityStoreEntry } = operation.payload;
        processedThreadActivityStore = {
          ...processedThreadActivityStore,
          [id]: threadActivityStoreEntry,
        };
      } else if (operation.type === 'remove_thread_activity_entries') {
        for (const id of operation.payload.ids) {
          const { [id]: _, ...rest } = processedThreadActivityStore;
          processedThreadActivityStore = rest;
        }
      } else if (operation.type === 'remove_all_thread_activity_entries') {
        processedThreadActivityStore = {};
      }
    }
    return processedThreadActivityStore;
  },
  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<ThreadActivityStoreOperation>,
  ): $ReadOnlyArray<ClientDBThreadActivityStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops.map(threadActivityStoreOperation => {
      if (
        threadActivityStoreOperation.type ===
          'remove_all_thread_activity_entries' ||
        threadActivityStoreOperation.type === 'remove_thread_activity_entries'
      ) {
        return threadActivityStoreOperation;
      }

      const { id, threadActivityStoreEntry } =
        threadActivityStoreOperation.payload;

      return {
        type: 'replace_thread_activity_entry',
        payload: convertThreadActivityEntryToClientDBThreadActivityEntry({
          id,
          threadActivityStoreEntry,
        }),
        isBackedUp: threadActivityStoreOperation.payload.isBackedUp,
      };
    });
  },

  translateClientDBData(
    data: $ReadOnlyArray<ClientDBThreadActivityEntry>,
  ): ThreadActivityStore {
    return Object.fromEntries(
      data.map((dbThreadActivityEntry: ClientDBThreadActivityEntry) => [
        dbThreadActivityEntry.id,
        JSON.parse(dbThreadActivityEntry.threadActivityStoreEntry),
      ]),
    );
  },
};

function createReplaceThreadActivityEntryOperation(
  id: string,
  threadActivityStoreEntry: ThreadActivityStoreEntry,
  threadInfos: RawThreadInfos,
): ReplaceThreadActivityEntryOperation {
  const threadInfo = threadInfos[id];
  return {
    type: 'replace_thread_activity_entry',
    payload: {
      id,
      threadActivityStoreEntry,
      isBackedUp: getDataIsBackedUpByThread(id, threadInfo),
    },
  };
}

export {
  threadActivityStoreOpsHandlers,
  convertThreadActivityEntryToClientDBThreadActivityEntry,
  createReplaceThreadActivityEntryOperation,
};
