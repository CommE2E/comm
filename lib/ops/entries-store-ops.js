// @flow

import type { BaseStoreOpsHandlers } from './base-ops.js';
import { daysToEntriesFromEntryInfos } from '../reducers/entry-reducer.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type {
  EntryStore,
  RawEntryInfo,
  RawEntryInfos,
} from '../types/entry-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import { values } from '../utils/objects.js';

type ReplaceEntryOperationPayload = {
  +id: string,
  +entry: RawEntryInfo,
  +isBackedUp: boolean,
};

export type ReplaceEntryOperation = {
  +type: 'replace_entry',
  +payload: ReplaceEntryOperationPayload,
};

export type RemoveEntriesOperation = {
  +type: 'remove_entries',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllEntriesOperation = {
  +type: 'remove_all_entries',
};

export type EntryStoreOperation =
  | ReplaceEntryOperation
  | RemoveEntriesOperation
  | RemoveAllEntriesOperation;

export type ClientDBEntryInfo = {
  +id: string,
  +entry: string,
};

export type ClientDBReplaceEntryOperation = {
  +type: 'replace_entry',
  +payload: ClientDBEntryInfo,
};

export type ClientDBEntryStoreOperation =
  | ClientDBReplaceEntryOperation
  | RemoveEntriesOperation
  | RemoveAllEntriesOperation;

function convertEntryInfoIntoClientDBEntryInfo({
  id,
  entry,
}: ReplaceEntryOperationPayload): ClientDBEntryInfo {
  return {
    id,
    entry: JSON.stringify(entry),
  };
}

const entryStoreOpsHandlers: BaseStoreOpsHandlers<
  EntryStore,
  EntryStoreOperation,
  ClientDBEntryStoreOperation,
  RawEntryInfos,
  ClientDBEntryInfo,
> = {
  processStoreOperations(
    entryStore: EntryStore,
    ops: $ReadOnlyArray<EntryStoreOperation>,
  ): EntryStore {
    if (ops.length === 0) {
      return entryStore;
    }

    const processedEntryStore = {
      ...entryStore,
    };
    for (const operation of ops) {
      if (operation.type === 'replace_entry') {
        processedEntryStore.entryInfos = {
          ...processedEntryStore.entryInfos,
          [operation.payload.id]: operation.payload.entry,
        };
      } else if (operation.type === 'remove_entries') {
        const idsToRemove = new Set(operation.payload.ids);
        processedEntryStore.entryInfos = Object.fromEntries(
          Object.entries(processedEntryStore.entryInfos).filter(
            ([id]) => !idsToRemove.has(id),
          ),
        );
      } else if (operation.type === 'remove_all_entries') {
        processedEntryStore.entryInfos = {};
      }
    }

    processedEntryStore.daysToEntries = daysToEntriesFromEntryInfos(
      values(processedEntryStore.entryInfos),
    );

    return processedEntryStore;
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<EntryStoreOperation>,
  ): $ReadOnlyArray<ClientDBEntryStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops.map(operation => {
      if (
        operation.type === 'remove_entries' ||
        operation.type === 'remove_all_entries'
      ) {
        return operation;
      }
      return {
        type: 'replace_entry',
        payload: convertEntryInfoIntoClientDBEntryInfo(operation.payload),
      };
    });
  },

  translateClientDBData(
    clientDBEntries: $ReadOnlyArray<ClientDBEntryInfo>,
  ): RawEntryInfos {
    return Object.fromEntries(
      clientDBEntries.map(({ id, entry }) => [id, JSON.parse(entry)]),
    );
  },
};

function createReplaceEntryOperation(
  id: string,
  entry: RawEntryInfo,
  threadInfos: RawThreadInfos,
): ReplaceEntryOperation {
  const threadInfo = threadInfos[entry.threadID];
  if (!threadInfo) {
    return {
      type: 'replace_entry',
      payload: { id, entry, isBackedUp: true },
    };
  }
  return {
    type: 'replace_entry',
    payload: {
      id,
      entry,
      isBackedUp: threadSpecs[threadInfo.type].protocol.dataIsBackedUp,
    },
  };
}

export {
  convertEntryInfoIntoClientDBEntryInfo,
  entryStoreOpsHandlers,
  createReplaceEntryOperation,
};
