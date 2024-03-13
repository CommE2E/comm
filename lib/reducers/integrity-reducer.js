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
import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import type { IntegrityStore } from '../types/integrity-types';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { fullStateSyncActionType } from '../types/socket-types.js';
import { hash } from '../utils/objects.js';

function reduceIntegrityStore(
  state: IntegrityStore,
  action: BaseAction,
  threadInfos: {
    +[string]: RawThreadInfo,
  },
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
): IntegrityStore {
  if (action.type === fullStateSyncActionType) {
    const threadHashesArray = Object.entries(state.threadHashes).filter(
      ([key]) => extractKeyserverIDFromID(key) !== action.payload.keyserverID,
    );
    const threadHashes = Object.fromEntries(threadHashesArray);
    return { threadHashes, threadHashingStatus: 'starting' };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverRegisterActionTypes.success ||
    (action.type === setClientDBStoreActionType &&
      !!action.payload.threadStore &&
      state.threadHashingStatus !== 'completed')
  ) {
    return { threadHashes: {}, threadHashingStatus: 'starting' };
  } else if (action.type === keyserverAuthActionTypes.success) {
    return { ...state, threadHashingStatus: 'starting' };
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

      newState = {
        ...newState,
        threadHashes: {
          ...newState.threadHashes,
          ...newThreadHashes,
        },
      };
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
  let processedThreadHashes = { ...newState.threadHashes };
  let threadHashingStatus = newState.threadHashingStatus;
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
      threadHashingStatus = 'completed';
    }
  }
  return {
    ...newState,
    threadHashes: processedThreadHashes,
    threadHashingStatus,
  };
}

export { reduceIntegrityStore };
