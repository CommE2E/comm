// @flow

import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import type { IntegrityStore } from '../types/integrity-types';
import type { BaseAction } from '../types/redux-types.js';
import { fullStateSyncActionType } from '../types/socket-types.js';
import type { RawThreadInfo } from '../types/thread-types.js';
import { hash } from '../utils/objects.js';

function reduceIntegrityStore(
  state: IntegrityStore,
  action: BaseAction,
  threadInfos: { +[string]: RawThreadInfo },
  threadStoreOperations: $ReadOnlyArray<ThreadStoreOperation>,
): IntegrityStore {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === registerActionTypes.success ||
    action.type === fullStateSyncActionType
  ) {
    return { threadHashes: {}, threadHashingComplete: false };
  }
  if (action.type === updateIntegrityStoreActionType) {
    let newState = state;
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
    if (action.payload.threadHashingComplete) {
      newState = {
        ...newState,
        threadHashingComplete: action.payload.threadHashingComplete,
      };
    }
    return newState;
  }
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
