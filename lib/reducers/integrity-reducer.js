// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import { legacySiweAuthActionTypes } from '../actions/siwe-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import {
  keyserverAuthActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import {
  integrityStoreOpsHandlers,
  type IntegrityStoreOperation,
} from '../ops/integrity-store-ops.js';
import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import type { IntegrityStore, ThreadHashes } from '../types/integrity-types';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  stateSyncPayloadTypes,
} from '../types/socket-types.js';
import { hash } from '../utils/objects.js';

const { processStoreOperations: processStoreOps } = integrityStoreOpsHandlers;

function reduceIntegrityStore(
  state: IntegrityStore,
  action: BaseAction,
  threadInfos: {
    +[string]: RawThreadInfo,
  },
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
): {
  +integrityStore: IntegrityStore,
  +integrityStoreOperations: $ReadOnlyArray<IntegrityStoreOperation>,
} {
  if (
    action.type === fullStateSyncActionType ||
    (action.type === fetchPendingUpdatesActionTypes.success &&
      action.payload.type === stateSyncPayloadTypes.FULL)
  ) {
    const removeAllOperation = { type: 'remove_all_integrity_thread_hashes' };
    const threadHashesArray = Object.entries(state.threadHashes).filter(
      ([key]) => extractKeyserverIDFromID(key) !== action.payload.keyserverID,
    );
    const replaceOperation = {
      type: 'replace_integrity_thread_hashes',
      payload: { threadHashes: Object.fromEntries(threadHashesArray) },
    };
    return {
      integrityStore: {
        threadHashes: processStoreOps(state, [
          removeAllOperation,
          replaceOperation,
        ]).threadHashes,
        threadHashingStatus: 'starting',
      },
      integrityStoreOperations: [removeAllOperation, replaceOperation],
    };
  } else if (
    action.type === legacyLogInActionTypes.success ||
    action.type === legacySiweAuthActionTypes.success ||
    (action.type === setClientDBStoreActionType &&
      !!action.payload.threadStore &&
      state.threadHashingStatus !== 'completed')
  ) {
    const removeAllOperation = { type: 'remove_all_integrity_thread_hashes' };
    return {
      integrityStore: {
        threadHashes: processStoreOps(state, [removeAllOperation]).threadHashes,
        threadHashingStatus: 'starting',
      },
      integrityStoreOperations: [removeAllOperation],
    };
  } else if (action.type === keyserverAuthActionTypes.success) {
    return {
      integrityStore: {
        threadHashes: processStoreOps(state, []).threadHashes,
        threadHashingStatus: 'starting',
      },
      integrityStoreOperations: [],
    };
  } else if (action.type === setClientDBStoreActionType) {
    const newThreadHashes = action.payload.threadHashes;

    if (!newThreadHashes) {
      return {
        integrityStore: state,
        integrityStoreOperations: [],
      };
    }

    const newIntegrityStore: IntegrityStore = {
      ...state,
      threadHashes: newThreadHashes,
    };

    return {
      integrityStore: newIntegrityStore,
      integrityStoreOperations: [],
    };
  }

  let newState = state;
  const integrityOperations: IntegrityStoreOperation[] = [];
  if (action.type === updateIntegrityStoreActionType) {
    if (action.payload.threadIDsToHash) {
      const newThreadHashes = Object.fromEntries(
        action.payload.threadIDsToHash
          .map(id => [id, threadInfos[id]])
          .filter(([, info]) => !!info)
          .map(([id, info]) => [id, hash(info)]),
      );
      const replaceOperation = {
        type: 'replace_integrity_thread_hashes',
        payload: { threadHashes: newThreadHashes },
      };

      newState = processStoreOps(state, [replaceOperation]);
      integrityOperations.push(replaceOperation);
    }
    if (action.payload.threadHashingStatus) {
      newState = {
        ...newState,
        threadHashingStatus: action.payload.threadHashingStatus,
      };
    }
  }
  if (threadStoreOperations.length === 0) {
    return {
      integrityStore: newState,
      integrityStoreOperations: integrityOperations,
    };
  }
  let groupedReplaceThreadHashes: ThreadHashes = {};
  let threadHashingStatus = newState.threadHashingStatus;
  for (const operation of threadStoreOperations) {
    if (
      operation.type !== 'replace' &&
      Object.keys(groupedReplaceThreadHashes).length > 0
    ) {
      integrityOperations.push({
        type: 'replace_integrity_thread_hashes',
        payload: { threadHashes: groupedReplaceThreadHashes },
      });
      groupedReplaceThreadHashes = {};
    }

    if (operation.type === 'replace') {
      const newIntegrityThreadHash = hash(operation.payload.threadInfo);
      groupedReplaceThreadHashes = {
        ...groupedReplaceThreadHashes,
        [operation.payload.id]: newIntegrityThreadHash,
      };
    } else if (operation.type === 'remove') {
      integrityOperations.push({
        type: 'remove_integrity_thread_hashes',
        payload: { ids: operation.payload.ids },
      });
    } else if (operation.type === 'remove_all') {
      integrityOperations.push({ type: 'remove_all_integrity_thread_hashes' });
      threadHashingStatus = 'completed';
    }
  }
  if (Object.keys(groupedReplaceThreadHashes).length > 0) {
    integrityOperations.push({
      type: 'replace_integrity_thread_hashes',
      payload: { threadHashes: groupedReplaceThreadHashes },
    });
  }

  return {
    integrityStore: {
      threadHashes: processStoreOps(newState, integrityOperations).threadHashes,
      threadHashingStatus,
    },
    integrityStoreOperations: integrityOperations,
  };
}

export { reduceIntegrityStore };
