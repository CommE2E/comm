// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import {
  transformKeyserverInfoToPersistedKeyserverInfo,
  transformPersistedKeyserverInfoToKeyserverInfo,
} from '../shared/transforms/keyserver-store-transform.js';
import type {
  KeyserverInfo,
  KeyserverInfos,
} from '../types/keyserver-types.js';

// client types
export type ReplaceKeyserverOperation = {
  +type: 'replace_keyserver',
  +payload: { id: string, keyserverInfo: KeyserverInfo },
};

export type RemoveKeyserverOperation = {
  +type: 'remove_keyserver',
  +payload: { id: string },
};

export type KeyserverStoreOperation =
  | ReplaceKeyserverOperation
  | RemoveKeyserverOperation;

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
  | RemoveKeyserverOperation;

function convertKeyserverInfoToClientDBKeyserverInfo({
  id,
  keyserverInfo,
}: {
  id: string,
  keyserverInfo: KeyserverInfo,
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
  KeyserverInfos,
  KeyserverStoreOperation,
  ClientDBKeyserverStoreOperation,
  KeyserverInfos,
  ClientDBKeyserverInfo,
> = {
  processStoreOperations(
    keyserverInfos: KeyserverInfos,
    ops: $ReadOnlyArray<KeyserverStoreOperation>,
  ): KeyserverInfos {
    if (ops.length === 0) {
      return keyserverInfos;
    }

    const processedKeyserverInfos = { ...keyserverInfos };
    for (const operation: KeyserverStoreOperation of ops) {
      if (operation.type === 'replace_keyserver') {
        processedKeyserverInfos[operation.payload.id] =
          operation.payload.keyserverInfo;
      } else if (operation.type === 'remove_keyserver') {
        delete processedKeyserverInfos[operation.payload.id];
      }
    }
    return processedKeyserverInfos;
  },

  convertOpsToClientDBOps(
    ops: $ReadOnlyArray<KeyserverStoreOperation>,
  ): $ReadOnlyArray<ClientDBKeyserverStoreOperation> {
    return ops.map(operation => {
      if (operation.type === 'remove_keyserver') {
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

export { keyserverStoreOpsHandlers };
