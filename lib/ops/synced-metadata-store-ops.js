// @flow

import type { BaseStoreOpsHandlers } from './base-ops.js';
import type {
  SyncedMetadata,
  SyncedMetadataStore,
} from '../types/synced-metadata-types.js';

// client types
export type ReplaceSyncedMetadataEntryOperation = {
  +type: 'replace_synced_metadata_entry',
  +payload: {
    +name: string,
    +data: string,
  },
};

export type RemoveSyncedMetadataOperation = {
  +type: 'remove_synced_metadata',
  +payload: { +names: $ReadOnlyArray<string> },
};

export type RemoveAllSyncedMetadataOperation = {
  +type: 'remove_all_synced_metadata',
};

export type SyncedMetadataStoreOperation =
  | ReplaceSyncedMetadataEntryOperation
  | RemoveSyncedMetadataOperation
  | RemoveAllSyncedMetadataOperation;

// SQLite types
export type ClientDBSyncedMetadataEntry = {
  +name: string,
  +data: string,
};

export type ClientDBSyncedMetadataStoreOperation =
  | ReplaceSyncedMetadataEntryOperation
  | RemoveSyncedMetadataOperation
  | RemoveAllSyncedMetadataOperation;

const syncedMetadataStoreOpsHandlers: BaseStoreOpsHandlers<
  SyncedMetadataStore,
  SyncedMetadataStoreOperation,
  ClientDBSyncedMetadataStoreOperation,
  SyncedMetadata,
  ClientDBSyncedMetadataEntry,
> = {
  processStoreOperations(
    syncedMetadataStore: SyncedMetadataStore,
    ops: $ReadOnlyArray<SyncedMetadataStoreOperation>,
  ): SyncedMetadataStore {
    if (ops.length === 0) {
      return syncedMetadataStore;
    }

    let processedSyncedMetadata = { ...syncedMetadataStore.syncedMetadata };

    for (const operation of ops) {
      if (operation.type === 'replace_synced_metadata_entry') {
        processedSyncedMetadata[operation.payload.name] =
          operation.payload.data;
      } else if (operation.type === 'remove_synced_metadata') {
        for (const name of operation.payload.names) {
          delete processedSyncedMetadata[name];
        }
      } else if (operation.type === 'remove_all_synced_metadata') {
        processedSyncedMetadata = {};
      }
    }

    return {
      ...syncedMetadataStore,
      syncedMetadata: processedSyncedMetadata,
    };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<SyncedMetadataStoreOperation>,
  ): $ReadOnlyArray<ClientDBSyncedMetadataStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops;
  },

  translateClientDBData(
    communites: $ReadOnlyArray<ClientDBSyncedMetadataEntry>,
  ): SyncedMetadata {
    const syncedMetadata: { [name: string]: string } = {};

    communites.forEach(dbSyncedMetadata => {
      syncedMetadata[dbSyncedMetadata.name] = dbSyncedMetadata.data;
    });

    return syncedMetadata;
  },
};

function createReplaceSyncedMetadataOperation(
  name: string,
  data: string,
): ReplaceSyncedMetadataEntryOperation {
  return {
    type: 'replace_synced_metadata_entry',
    payload: {
      name,
      data,
    },
  };
}

export { syncedMetadataStoreOpsHandlers, createReplaceSyncedMetadataOperation };
