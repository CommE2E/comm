// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type { ThreadHashes, IntegrityStore } from '../types/integrity-types.js';

// client types
export type ReplaceIntegrityThreadHashesOperation = {
  +type: 'replace_integrity_thread_hashes',
  +payload: { +threadHashes: ThreadHashes },
};

export type RemoveAllIntegrityThreadHashesOperation = {
  +type: 'remove_all_integrity_thread_hashes',
};

export type IntegrityStoreOperation =
  | ReplaceIntegrityThreadHashesOperation
  | RemoveAllIntegrityThreadHashesOperation;

// SQLite types
export type ClientDBIntegrityThreadHash = {
  +id: string,
  +threadHash: number,
};

export type ClientDBReplaceIntegrityThreadHashOperation = {
  +type: 'replace_integrity_thread_hashes',
  +payload: { +threadHashes: $ReadOnlyArray<ClientDBIntegrityThreadHash> },
};

export type ClientDBIntegrityThreadHashesOperation =
  | ClientDBReplaceIntegrityThreadHashOperation
  | RemoveAllIntegrityThreadHashesOperation;

const integrityStoreOpsHandlers: BaseStoreOpsHandlers<
  IntegrityStore,
  IntegrityStoreOperation,
  ClientDBIntegrityThreadHashesOperation,
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
      } else if (operation.type === 'remove_all_integrity_thread_hashes') {
        processedThreadHashes = {};
      }
    }
    return { ...integrityStore, threadHashes: processedThreadHashes };
  },

  convertOpsToClientDBOps(
    ops: $ReadOnlyArray<IntegrityStoreOperation>,
  ): $ReadOnlyArray<ClientDBIntegrityThreadHashesOperation> {
    const convertedOperations = ops.map(integrityStoreOperation => {
      if (
        integrityStoreOperation.type === 'remove_all_integrity_thread_hashes'
      ) {
        return integrityStoreOperation;
      }

      const threadHashes: ThreadHashes =
        integrityStoreOperation.payload.threadHashes;
      const dbIntegrityThreadHashes: ClientDBIntegrityThreadHash[] = [];
      for (const id in threadHashes) {
        dbIntegrityThreadHashes.push({ id, threadHash: threadHashes[id] });
      }

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
        dbThreadHash.threadHash,
      ]),
    );
  },
};

export { integrityStoreOpsHandlers };
