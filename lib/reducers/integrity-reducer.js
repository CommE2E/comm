// @flow

import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import type { IntegrityStore } from '../types/integrity-types';
import { hash } from '../utils/objects.js';

function reduceIntegrityStore(
  state: IntegrityStore,
  {
    threadStoreOperations,
  }: { threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation> },
): IntegrityStore {
  if (threadStoreOperations.length === 0) {
    return state;
  }
  let processedThreadHashes = { ...state.threadHashes };
  for (const operation of threadStoreOperations) {
    if (operation.type === 'replace') {
      processedThreadHashes[operation.payload.id] = hash(
        operation.payload.threadInfo,
      );
    } else if (operation.type === 'remove') {
      for (const id of operation.payload.ids) {
        delete processedThreadHashes[id];
      }
    } else if (operation.type === 'remove_all') {
      processedThreadHashes = {};
    }
  }
  return { ...state, threadHashes: processedThreadHashes };
}

export { reduceIntegrityStore };
