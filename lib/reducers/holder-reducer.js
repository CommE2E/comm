// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import _omitBy from 'lodash/fp/omitBy.js';

import {
  processHoldersActionTypes,
  storeEstablishedHolderActionType,
} from '../actions/holder-actions.js';
import {
  type HolderInfo,
  type HolderStatus,
  type HolderStore,
  type BlobHashAndHolder,
} from '../types/holder-types.js';
import type { BaseAction } from '../types/redux-types.js';

const makeResultToStoreEntryMapper: (
  status: HolderStatus,
) => BlobHashAndHolder => [string, HolderInfo] =
  status =>
  ({ blobHash, holder }) => [blobHash, { holder, status }];

const mapResultsToStoreEntries: (status: HolderStatus) => (
  results: $ReadOnlyArray<BlobHashAndHolder>,
) => {
  +[blobHash: string]: HolderInfo,
} = status => {
  const mapFn = makeResultToStoreEntryMapper(status);
  return results => Object.fromEntries(results.map(mapFn));
};

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
  } else if (action.type === processHoldersActionTypes.started) {
    // marks processed holders as pending
    const { holdersToAdd, holdersToRemove } = action.payload;
    const pendingEstablishmentHolders = mapResultsToStoreEntries(
      'PENDING_ESTABLISHMENT',
    )(holdersToAdd);
    const pendingRemovalHolders =
      mapResultsToStoreEntries('PENDING_REMOVAL')(holdersToRemove);
    return {
      ...store,
      storedHolders: {
        ...store.storedHolders,
        ...pendingEstablishmentHolders,
        ...pendingRemovalHolders,
      },
    };
  } else if (action.type === processHoldersActionTypes.failed) {
    // marks all pending holders as failed
    const storedHolders = _mapValues((holderInfo: HolderInfo): HolderInfo => ({
      ...holderInfo,
      status:
        holderInfo.status === 'PENDING_ESTABLISHMENT'
          ? 'NOT_ESTABLISHED'
          : holderInfo.status === 'PENDING_REMOVAL'
            ? 'NOT_REMOVED'
            : holderInfo.status,
    }))(store.storedHolders);
    return {
      ...store,
      storedHolders,
    };
  } else if (action.type === processHoldersActionTypes.success) {
    const { added, removed, notAdded, notRemoved } = action.payload;

    const removedBlobHashes = new Set(removed.map(({ blobHash }) => blobHash));
    const filteredStore = _omitBy((_, blobHash) =>
      removedBlobHashes.has(blobHash),
    )(store.storedHolders);

    const holdersAdded = mapResultsToStoreEntries('ESTABLISHED')(added);
    const holdersNotAdded =
      mapResultsToStoreEntries('NOT_ESTABLISHED')(notAdded);
    const holdersNotRemoved =
      mapResultsToStoreEntries('NOT_REMOVED')(notRemoved);

    return {
      ...store,
      storedHolders: {
        ...filteredStore,
        ...holdersAdded,
        ...holdersNotAdded,
        ...holdersNotRemoved,
      },
    };
  }
  return store;
}

export { reduceHolderStore };
