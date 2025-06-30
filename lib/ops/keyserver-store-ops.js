// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type { PersistedKeyserverInfo } from '../shared/transforms/keyserver-store-transform.js';
import {
  transformKeyserverInfoToPersistedKeyserverInfo,
  transformPersistedKeyserverInfoToKeyserverInfo,
} from '../shared/transforms/keyserver-store-transform.js';
import {
  type KeyserverInfo,
  type KeyserverInfos,
  type KeyserverStore,
  defaultKeyserverInfo,
} from '../types/keyserver-types.js';
import { getConfig } from '../utils/config.js';

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
  +syncedKeyserverInfo: string,
};

export type ClientDBReplaceKeyserverOperation = {
  +type: 'replace_keyserver',
  +payload: ClientDBKeyserverInfo,
};

export type ClientDBKeyserverStoreOperation =
  | ClientDBReplaceKeyserverOperation
  | RemoveKeyserversOperation
  | RemoveAllKeyserversOperation;

type SyncedKeyserverInfoData = { +urlPrefix: string };

function convertKeyserverInfoToClientDBKeyserverInfo({
  id,
  keyserverInfo,
}: {
  +id: string,
  +keyserverInfo: KeyserverInfo,
}): ClientDBKeyserverInfo {
  const persistedKeyserverInfo =
    transformKeyserverInfoToPersistedKeyserverInfo(keyserverInfo);
  const { urlPrefix, ...nonSyncedData } = persistedKeyserverInfo;
  const syncedData: SyncedKeyserverInfoData = { urlPrefix };
  return {
    id,
    keyserverInfo: JSON.stringify(nonSyncedData),
    syncedKeyserverInfo: JSON.stringify(syncedData),
  };
}

function convertClientDBKeyserverInfoToKeyserverInfo(
  dbKeyserverInfo: ClientDBKeyserverInfo,
): KeyserverInfo {
  const persistedSyncedKeyserverInfo: SyncedKeyserverInfoData = JSON.parse(
    dbKeyserverInfo.syncedKeyserverInfo,
  );

  let persistedKeyserverInfo: PersistedKeyserverInfo;
  if (dbKeyserverInfo.keyserverInfo.length > 0) {
    const persistedNonSyncedKeyserverInfo: Omit<
      PersistedKeyserverInfo,
      $Keys<SyncedKeyserverInfoData>,
    > = JSON.parse(dbKeyserverInfo.keyserverInfo);

    persistedKeyserverInfo = {
      ...persistedNonSyncedKeyserverInfo,
      ...persistedSyncedKeyserverInfo,
    };
  } else {
    const defaultPersistedNonSyncedKeyserverInfo =
      transformKeyserverInfoToPersistedKeyserverInfo(
        defaultKeyserverInfo(
          persistedSyncedKeyserverInfo.urlPrefix,
          getConfig().platformDetails.platform,
        ),
      );

    persistedKeyserverInfo = {
      ...defaultPersistedNonSyncedKeyserverInfo,
      ...persistedSyncedKeyserverInfo,
    };
  }

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
    ops: ?$ReadOnlyArray<KeyserverStoreOperation>,
  ): $ReadOnlyArray<ClientDBKeyserverStoreOperation> {
    if (!ops) {
      return [];
    }
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
  const idsToRemove: Set<string> = new Set();
  for (const op of ops) {
    if (op.type !== 'remove_keyservers') {
      continue;
    }
    for (const id of op.payload.ids) {
      idsToRemove.add(id);
    }
  }

  return [...idsToRemove];
}

export {
  keyserverStoreOpsHandlers,
  convertKeyserverInfoToClientDBKeyserverInfo,
  getKeyserversToRemoveFromNotifsStore,
};
