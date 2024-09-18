// @flow

import { storeEstablishedHolderActionType } from '../actions/holder-actions.js';
import { type HolderStore } from '../types/holder-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceHolderStore(
  store: HolderStore,
  action: BaseAction,
): HolderStore {
  if (action.type === storeEstablishedHolderActionType) {
    const { blobHash, holder } = action.payload;
    return {
      ...store,
      storedHolders: {
        ...store.storedHolders,
        [blobHash]: { holder, status: 'ESTABLISHED' },
      },
    };
  }
  return store;
}

export { reduceHolderStore };
