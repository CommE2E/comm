// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  setSyncedMetadataEntryActionType,
  clearSyncedMetadataEntryActionType,
} from '../actions/synced-metadata-actions.js';
import {
  syncedMetadataStoreOpsHandlers,
  type SyncedMetadataStoreOperation,
  type ReplaceSyncedMetadataEntryOperation,
  type RemoveSyncedMetadataOperation,
} from '../ops/synced-metadata-store-ops.js';
import type { BaseAction } from '../types/redux-types.js';
import type { SyncedMetadataStore } from '../types/synced-metadata-types.js';

const { processStoreOperations: processStoreOps } =
  syncedMetadataStoreOpsHandlers;

function reduceSyncedMetadataStore(
  state: SyncedMetadataStore,
  action: BaseAction,
  // IMPORTANT: always process and return predefinedStoreOperations,
  // regardless of action type; the only exception
  // is setClientDBStoreActionType
  predefinedStoreOperations: $ReadOnlyArray<SyncedMetadataStoreOperation>,
): {
  +syncedMetadataStore: SyncedMetadataStore,
  +syncedMetadataStoreOperations: $ReadOnlyArray<SyncedMetadataStoreOperation>,
} {
  if (action.type === setSyncedMetadataEntryActionType) {
    const replaceOperation: ReplaceSyncedMetadataEntryOperation = {
      type: 'replace_synced_metadata_entry',
      payload: action.payload,
    };

    const syncedMetadataStoreOperations = [
      ...predefinedStoreOperations,
      replaceOperation,
    ];

    return {
      syncedMetadataStore: processStoreOps(
        state,
        syncedMetadataStoreOperations,
      ),
      syncedMetadataStoreOperations,
    };
  } else if (action.type === clearSyncedMetadataEntryActionType) {
    const removeOperation: RemoveSyncedMetadataOperation = {
      type: 'remove_synced_metadata',
      payload: {
        names: [action.payload.name],
      },
    };

    const syncedMetadataStoreOperations = [
      ...predefinedStoreOperations,
      removeOperation,
    ];

    return {
      syncedMetadataStore: processStoreOps(
        state,
        syncedMetadataStoreOperations,
      ),
      syncedMetadataStoreOperations,
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
    syncedMetadataStore: processStoreOps(state, predefinedStoreOperations),
    syncedMetadataStoreOperations: predefinedStoreOperations,
  };
}

export { reduceSyncedMetadataStore };
