// @flow

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
  holderStatuses,
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
        [blobHash]: {
          ...store.storedHolders[blobHash],
          holder,
          status: holderStatuses.ESTABLISHED,
        },
      },
    };
  } else if (action.type === processHoldersActionTypes.started) {
    // marks processed holders as pending
    const { holdersToAdd, holdersToRemove } = action.payload;
    const pendingEstablishmentHolders = mapResultsToStoreEntries(
      holderStatuses.PENDING_ESTABLISHMENT,
    )(holdersToAdd);
    const pendingRemovalHolders = mapResultsToStoreEntries(
      holderStatuses.PENDING_REMOVAL,
    )(holdersToRemove);
    return {
      ...store,
      storedHolders: {
        ...store.storedHolders,
        ...pendingEstablishmentHolders,
        ...pendingRemovalHolders,
      },
    };
  } else if (action.type === processHoldersActionTypes.failed) {
    const { notAdded, notRemoved } = action.payload;
    const notEstablishedHolders = mapResultsToStoreEntries(
      holderStatuses.NOT_ESTABLISHED,
    )(notAdded);
    const notRemovedHolders = mapResultsToStoreEntries(
      holderStatuses.NOT_REMOVED,
    )(notRemoved);
    return {
      ...store,
      storedHolders: {
        ...store.storedHolders,
        ...notEstablishedHolders,
        ...notRemovedHolders,
      },
    };
  } else if (action.type === processHoldersActionTypes.success) {
    const { added, removed, notAdded, notRemoved } = action.payload;

    const removedBlobHashes = new Set(removed.map(({ blobHash }) => blobHash));
    const filteredStore = _omitBy((_, blobHash) =>
      removedBlobHashes.has(blobHash),
    )(store.storedHolders);

    const holdersAdded = mapResultsToStoreEntries(holderStatuses.ESTABLISHED)(
      added,
    );
    const holdersNotAdded = mapResultsToStoreEntries(
      holderStatuses.NOT_ESTABLISHED,
    )(notAdded);
    const holdersNotRemoved = mapResultsToStoreEntries(
      holderStatuses.NOT_REMOVED,
    )(notRemoved);

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
