// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  keyserverAuthActionTypes,
  logInActionTypes,
  keyserverRegisterActionTypes,
} from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import {
  integrityStoreOpsHandlers,
  type IntegrityStoreOperation,
} from '../ops/integrity-store-ops.js';
import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import type { IntegrityStore } from '../types/integrity-types';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { fullStateSyncActionType } from '../types/socket-types.js';
import { hash } from '../utils/objects.js';

const { processStoreOperations: processStoreOps } = integrityStoreOpsHandlers;

function reduceIntegrityStore(
  state: IntegrityStore,
  action: BaseAction,
  threadInfos: {
    +[string]: RawThreadInfo,
  },
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
): IntegrityStore {
  if (action.type === fullStateSyncActionType) {
    const removeAllOperation = { type: 'remove_all_integrity_thread_hashes' };
    const threadHashesArray = Object.entries(state.threadHashes).filter(
      ([key]) => extractKeyserverIDFromID(key) !== action.payload.keyserverID,
    );
    const threadHashes = Object.fromEntries(threadHashesArray);
    const replaceOperation = {
      type: 'replace_integrity_thread_hashes',
      payload: { threadHashes },
    };
    return {
      threadHashes: processStoreOps(state, [
        removeAllOperation,
        replaceOperation,
      ]).threadHashes,
      threadHashingStatus: 'starting',
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverRegisterActionTypes.success ||
    (action.type === setClientDBStoreActionType &&
      !!action.payload.threadStore &&
      state.threadHashingStatus !== 'completed')
  ) {
    const removeAllOperation = { type: 'remove_all_integrity_thread_hashes' };
    return {
      threadHashes: processStoreOps(state, [removeAllOperation]).threadHashes,
      threadHashingStatus: 'starting',
    };
  } else if (action.type === keyserverAuthActionTypes.success) {
    return {
      threadHashes: processStoreOps(state, []).threadHashes,
      threadHashingStatus: 'starting',
    };
  }
  let newState = state;
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
    }
    if (action.payload.threadHashingStatus) {
      newState = {
        ...newState,
        threadHashingStatus: action.payload.threadHashingStatus,
      };
    }
  }
  if (threadStoreOperations.length === 0) {
    return newState;
  }
  const integrityOperations: IntegrityStoreOperation[] = [];
  let threadHashingStatus = newState.threadHashingStatus;
  for (const operation of threadStoreOperations) {
    if (operation.type === 'replace') {
      const newIntegrityThreadHash = hash(operation.payload.threadInfo);
      integrityOperations.push({
        type: 'replace_integrity_thread_hashes',
        payload: {
          threadHashes: { [operation.payload.id]: newIntegrityThreadHash },
        },
      });
    } else if (operation.type === 'remove') {
      for (const id of operation.payload.ids) {
        integrityOperations.push({
          type: 'remove_integrity_thread_hashes',
          payload: { ids: [id] },
        });
      }
    } else if (operation.type === 'remove_all') {
      integrityOperations.push({ type: 'remove_all_integrity_thread_hashes' });
      threadHashingStatus = 'completed';
    }
  }
  return {
    ...newState,
    threadHashes: processStoreOps(newState, integrityOperations).threadHashes,
    threadHashingStatus,
  };
}

export { reduceIntegrityStore };
