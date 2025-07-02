// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type {
  HolderStore,
  HolderItem,
  ClientDBHolderItem,
  StoredHolders,
} from '../types/holder-types.js';
import { assertHolderStatus } from '../types/holder-types.js';

export type RemoveHoldersOperation = {
  +type: 'remove_holders',
  +payload: { +hashes: $ReadOnlyArray<string> },
};

export type ReplaceHoldersOperation = {
  +type: 'replace_holders',
  +payload: { +items: $ReadOnlyArray<HolderItem> },
};

export type HolderStoreOperation =
  | RemoveHoldersOperation
  | ReplaceHoldersOperation;

export type ReplaceClientDBHoldersOperation = {
  +type: 'replace_holders',
  +payload: { +items: $ReadOnlyArray<ClientDBHolderItem> },
};

export type ClientDBHolderStoreOperation =
  | RemoveHoldersOperation
  | ReplaceClientDBHoldersOperation;

export const holderStoreOpsHandlers: BaseStoreOpsHandlers<
  HolderStore,
  HolderStoreOperation,
  ClientDBHolderStoreOperation,
  StoredHolders,
  ClientDBHolderItem,
> = {
  processStoreOperations(
    store: HolderStore,
    ops: $ReadOnlyArray<HolderStoreOperation>,
  ): HolderStore {
    if (ops.length === 0) {
      return store;
    }
    const processedHolders = { ...store.storedHolders };
    for (const operation of ops) {
      if (operation.type === 'replace_holders') {
        const { items } = operation.payload;
        for (const holderItem of items) {
          processedHolders[holderItem.hash] = {
            holder: holderItem.holder,
            status: holderItem.status,
          };
        }
      } else if (operation.type === 'remove_holders') {
        for (const hash of operation.payload.hashes) {
          delete processedHolders[hash];
        }
      }
    }
    return { ...store, storedHolders: processedHolders };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<HolderStoreOperation>,
  ): $ReadOnlyArray<ClientDBHolderStoreOperation> {
    return ops ?? [];
  },

  translateClientDBData(
    data: $ReadOnlyArray<ClientDBHolderItem>,
  ): StoredHolders {
    return Object.fromEntries(
      data.map((holderItem: ClientDBHolderItem) => [
        holderItem.hash,
        {
          holder: holderItem.holder,
          status: assertHolderStatus(holderItem.status),
        },
      ]),
    );
  },
};
