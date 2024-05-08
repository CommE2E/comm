// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type { ThreadHashes, IntegrityStore } from '../types/integrity-types.js';
import { entries } from '../utils/objects.js';

// client types
export type ReplaceIntegrityThreadHashesOperation = {
  +type: 'replace_integrity_thread_hashes',
  +payload: { +threadHashes: ThreadHashes },
};

export type RemoveIntegrityThreadHashesOperation = {
  +type: 'remove_integrity_thread_hashes',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllIntegrityThreadHashesOperation = {
  +type: 'remove_all_integrity_thread_hashes',
};

export type IntegrityStoreOperation =
  | ReplaceIntegrityThreadHashesOperation
  | RemoveIntegrityThreadHashesOperation
  | RemoveAllIntegrityThreadHashesOperation;

// SQLite types
export type ClientDBIntegrityThreadHash = {
  +id: string,
  +threadHash: string,
};

export type ClientDBReplaceIntegrityThreadHashOperation = {
  +type: 'replace_integrity_thread_hashes',
  +payload: { +threadHashes: $ReadOnlyArray<ClientDBIntegrityThreadHash> },
};

export type ClientDBIntegrityStoreOperation =
  | ClientDBReplaceIntegrityThreadHashOperation
  | RemoveIntegrityThreadHashesOperation
  | RemoveAllIntegrityThreadHashesOperation;

function convertIntegrityThreadHashesToClientDBIntegrityThreadHashes(
  threadHashes: ThreadHashes,
): $ReadOnlyArray<ClientDBIntegrityThreadHash> {
  return entries(threadHashes).map(([id, threadHash]) => ({
    id: id,
    threadHash: threadHash.toString(),
  }));
}

const integrityStoreOpsHandlers: BaseStoreOpsHandlers<
  IntegrityStore,
  IntegrityStoreOperation,
  ClientDBIntegrityStoreOperation,
  ThreadHashes,
  ClientDBIntegrityThreadHash,
> = {
  processStoreOperations(
    integrityStore: IntegrityStore,
    ops: $ReadOnlyArray<IntegrityStoreOperation>,
  ): IntegrityStore {
    if (ops.length === 0) {
      return integrityStore;
    }

    let processedThreadHashes = { ...integrityStore.threadHashes };
    for (const operation: IntegrityStoreOperation of ops) {
      if (operation.type === 'replace_integrity_thread_hashes') {
        for (const id in operation.payload.threadHashes) {
          processedThreadHashes[id] = operation.payload.threadHashes[id];
        }
      } else if (operation.type === 'remove_integrity_thread_hashes') {
        for (const id of operation.payload.ids) {
          delete processedThreadHashes[id];
        }
      } else if (operation.type === 'remove_all_integrity_thread_hashes') {
        processedThreadHashes = {};
      }
    }
    return { ...integrityStore, threadHashes: processedThreadHashes };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<IntegrityStoreOperation>,
  ): $ReadOnlyArray<ClientDBIntegrityStoreOperation> {
    if (!ops) {
      return [];
    }
    const convertedOperations = ops.map(integrityStoreOperation => {
      if (
        integrityStoreOperation.type === 'remove_all_integrity_thread_hashes' ||
        integrityStoreOperation.type === 'remove_integrity_thread_hashes'
      ) {
        return integrityStoreOperation;
      }

      const { threadHashes } = integrityStoreOperation.payload;
      const dbIntegrityThreadHashes: $ReadOnlyArray<ClientDBIntegrityThreadHash> =
        convertIntegrityThreadHashesToClientDBIntegrityThreadHashes(
          threadHashes,
        );

      if (dbIntegrityThreadHashes.length === 0) {
        return undefined;
      }
      return {
        type: 'replace_integrity_thread_hashes',
        payload: { threadHashes: dbIntegrityThreadHashes },
      };
    });

    return convertedOperations.filter(Boolean);
  },

  translateClientDBData(
    data: $ReadOnlyArray<ClientDBIntegrityThreadHash>,
  ): ThreadHashes {
    return Object.fromEntries(
      data.map((dbThreadHash: ClientDBIntegrityThreadHash) => [
        dbThreadHash.id,
        Number(dbThreadHash.threadHash),
      ]),
    );
  },
};

export {
  integrityStoreOpsHandlers,
  convertIntegrityThreadHashesToClientDBIntegrityThreadHashes,
};
