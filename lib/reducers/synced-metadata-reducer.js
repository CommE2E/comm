// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { addSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import {
  syncedMetadataStoreOpsHandlers,
  type SyncedMetadataStoreOperation,
  type ReplaceSyncedMetadataEntryOperation,
} from '../ops/synced-metadata-store-ops.js';
import type { BaseAction } from '../types/redux-types';
import type { SyncedMetadataStore } from '../types/synced-metadata-types.js';

const { processStoreOperations: processStoreOps } =
  syncedMetadataStoreOpsHandlers;

function reduceSyncedMetadataStore(
  state: SyncedMetadataStore,
  action: BaseAction,
): {
  +syncedMetadataStore: SyncedMetadataStore,
  +syncedMetadataStoreOperations: $ReadOnlyArray<SyncedMetadataStoreOperation>,
} {
  if (action.type === addSyncedMetadataEntryActionType) {
    const replaceOperation: ReplaceSyncedMetadataEntryOperation = {
      type: 'replace_synced_metadata_entry',
      payload: {
        name: action.payload.name,
        data: action.payload.data,
      },
    };

    return {
      syncedMetadataStore: processStoreOps(state, [replaceOperation]),
      syncedMetadataStoreOperations: [replaceOperation],
    };
  } else if (action.type === setClientDBStoreActionType) {
    const newSyncedMetadata = action.payload.syncedMetadata;

    if (!newSyncedMetadata) {
      return {
        syncedMetadataStore: state,
        syncedMetadataStoreOperations: [],
      };
    }

    const newSyncedMetadataStore: SyncedMetadataStore = {
      ...state,
      syncedMetadata: newSyncedMetadata,
    };

    return {
      syncedMetadataStore: newSyncedMetadataStore,
      syncedMetadataStoreOperations: [],
    };
  }

  return {
    syncedMetadataStore: state,
    syncedMetadataStoreOperations: [],
  };
}

export { reduceSyncedMetadataStore };
