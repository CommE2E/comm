// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import {
  transformKeyserverInfoToPersistedKeyserverInfo,
  transformPersistedKeyserverInfoToKeyserverInfo,
} from '../shared/transforms/keyserver-store-transform.js';
import type {
  KeyserverInfo,
  KeyserverInfos,
  KeyserverStore,
} from '../types/keyserver-types.js';

// client types
export type ReplaceKeyserverOperation = {
  +type: 'replace_keyserver',
  +payload: { +id: string, +keyserverInfo: KeyserverInfo },
};

export type RemoveKeyserversOperation = {
  +type: 'remove_keyservers',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllKeyserversOperation = {
  +type: 'remove_all_keyservers',
};

export type KeyserverStoreOperation =
  | ReplaceKeyserverOperation
  | RemoveKeyserversOperation
  | RemoveAllKeyserversOperation;

// SQLite types
export type ClientDBKeyserverInfo = {
  +id: string,
  +keyserverInfo: string,
};

export type ClientDBReplaceKeyserverOperation = {
  +type: 'replace_keyserver',
  +payload: ClientDBKeyserverInfo,
};

export type ClientDBKeyserverStoreOperation =
  | ClientDBReplaceKeyserverOperation
  | RemoveKeyserversOperation
  | RemoveAllKeyserversOperation;

function convertKeyserverInfoToClientDBKeyserverInfo({
  id,
  keyserverInfo,
}: {
  +id: string,
  +keyserverInfo: KeyserverInfo,
}): ClientDBKeyserverInfo {
  const persistedKeyserverInfo =
    transformKeyserverInfoToPersistedKeyserverInfo(keyserverInfo);
  return {
    id,
    keyserverInfo: JSON.stringify(persistedKeyserverInfo),
  };
}

function convertClientDBKeyserverInfoToKeyserverInfo(
  dbKeyserverInfo: ClientDBKeyserverInfo,
): KeyserverInfo {
  const persistedKeyserverInfo = JSON.parse(dbKeyserverInfo.keyserverInfo);
  return transformPersistedKeyserverInfoToKeyserverInfo(persistedKeyserverInfo);
}

const keyserverStoreOpsHandlers: BaseStoreOpsHandlers<
  KeyserverStore,
  KeyserverStoreOperation,
  ClientDBKeyserverStoreOperation,
  KeyserverInfos,
  ClientDBKeyserverInfo,
> = {
  processStoreOperations(
    keyserverStore: KeyserverStore,
    ops: $ReadOnlyArray<KeyserverStoreOperation>,
  ): KeyserverStore {
    if (ops.length === 0) {
      return keyserverStore;
    }

    let processedKeyserverInfos = { ...keyserverStore.keyserverInfos };
    for (const operation: KeyserverStoreOperation of ops) {
      if (operation.type === 'replace_keyserver') {
        processedKeyserverInfos[operation.payload.id] =
          operation.payload.keyserverInfo;
      } else if (operation.type === 'remove_keyservers') {
        for (const id of operation.payload.ids) {
          delete processedKeyserverInfos[id];
        }
      } else if (operation.type === 'remove_all_keyservers') {
        processedKeyserverInfos = {};
      }
    }
    return { ...keyserverStore, keyserverInfos: processedKeyserverInfos };
  },

  convertOpsToClientDBOps(
    ops: $ReadOnlyArray<KeyserverStoreOperation>,
  ): $ReadOnlyArray<ClientDBKeyserverStoreOperation> {
    return ops.map(operation => {
      if (
        operation.type === 'remove_keyservers' ||
        operation.type === 'remove_all_keyservers'
      ) {
        return operation;
      }
      return {
        type: 'replace_keyserver',
        payload: convertKeyserverInfoToClientDBKeyserverInfo(operation.payload),
      };
    });
  },

  translateClientDBData(
    keyservers: $ReadOnlyArray<ClientDBKeyserverInfo>,
  ): KeyserverInfos {
    const keyserverInfos: { [id: string]: KeyserverInfo } = {};
    keyservers.forEach(dbKeyserver => {
      keyserverInfos[dbKeyserver.id] =
        convertClientDBKeyserverInfoToKeyserverInfo(dbKeyserver);
    });

    return keyserverInfos;
  },
};

function getKeyserversToRemoveFromNotifsStore(
  ops: $ReadOnlyArray<KeyserverStoreOperation>,
): $ReadOnlyArray<string> {
  const removeKeyserversOperations: Array<RemoveKeyserversOperation> = [];
  for (const op of ops) {
    if (op.type === 'remove_keyservers') {
      removeKeyserversOperations.push(op);
    }
  }

  return removeKeyserversOperations
    .map(operation => operation.payload.ids)
    .flat();
}

export {
  keyserverStoreOpsHandlers,
  convertKeyserverInfoToClientDBKeyserverInfo,
  getKeyserversToRemoveFromNotifsStore,
};
