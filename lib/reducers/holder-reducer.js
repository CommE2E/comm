// @flow

import {
  processHoldersActionTypes,
  storeEstablishedHolderActionType,
} from '../actions/holder-actions.js';
import type { HolderStoreOperation } from '../ops/holder-store-ops.js';
import {
  createReplaceHolderOperation,
  holderStoreOpsHandlers,
} from '../ops/holder-store-ops.js';
import {
  type HolderItem,
  type HolderStatus,
  type HolderStore,
  type BlobHashAndHolder,
  holderStatuses,
} from '../types/holder-types.js';
import type { BaseAction } from '../types/redux-types.js';

const mapResultsToHolderItems: (
  status: HolderStatus,
) => (
  results: $ReadOnlyArray<BlobHashAndHolder>,
) => $ReadOnlyArray<HolderItem> = status => {
  return results =>
    results.map((item: BlobHashAndHolder) => ({
      hash: item.blobHash,
      holder: item.holder,
      status,
    }));
};

const { processStoreOperations: processHolderStoreOperations } =
  holderStoreOpsHandlers;

type ReduceHolderStoreResult = {
  +holderStore: HolderStore,
  +holderStoreOperations: $ReadOnlyArray<HolderStoreOperation>,
};
function reduceHolderStore(
  store: HolderStore,
  action: BaseAction,
): ReduceHolderStoreResult {
  if (action.type === storeEstablishedHolderActionType) {
    const { blobHash, holder } = action.payload;
    const holderStoreOperations: $ReadOnlyArray<HolderStoreOperation> = [
      createReplaceHolderOperation([
        {
          hash: blobHash,
          holder,
          status: holderStatuses.ESTABLISHED,
        },
      ]),
    ];
    return {
      holderStore: processHolderStoreOperations(store, holderStoreOperations),
      holderStoreOperations,
    };
  } else if (action.type === processHoldersActionTypes.started) {
    // marks processed holders as pending
    const { holdersToAdd, holdersToRemove } = action.payload;
    const pendingEstablishmentHolders = mapResultsToHolderItems(
      holderStatuses.PENDING_ESTABLISHMENT,
    )(holdersToAdd);
    const pendingRemovalHolders = mapResultsToHolderItems(
      holderStatuses.PENDING_REMOVAL,
    )(holdersToRemove);

    const holderStoreOperations: $ReadOnlyArray<HolderStoreOperation> = [
      createReplaceHolderOperation([
        ...pendingEstablishmentHolders,
        ...pendingRemovalHolders,
      ]),
    ];
    return {
      holderStore: processHolderStoreOperations(store, holderStoreOperations),
      holderStoreOperations,
    };
  } else if (action.type === processHoldersActionTypes.failed) {
    const { notAdded, notRemoved } = action.payload;
    const notEstablishedHolders = mapResultsToHolderItems(
      holderStatuses.NOT_ESTABLISHED,
    )(notAdded);
    const notRemovedHolders = mapResultsToHolderItems(
      holderStatuses.NOT_REMOVED,
    )(notRemoved);

    const holderStoreOperations: $ReadOnlyArray<HolderStoreOperation> = [
      createReplaceHolderOperation([
        ...notEstablishedHolders,
        ...notRemovedHolders,
      ]),
    ];
    return {
      holderStore: processHolderStoreOperations(store, holderStoreOperations),
      holderStoreOperations,
    };
  } else if (action.type === processHoldersActionTypes.success) {
    const { added, removed, notAdded, notRemoved } = action.payload;

    const removedBlobHashes = new Set(removed.map(({ blobHash }) => blobHash));

    const holdersAdded = mapResultsToHolderItems(holderStatuses.ESTABLISHED)(
      added,
    );
    const holdersNotAdded = mapResultsToHolderItems(
      holderStatuses.NOT_ESTABLISHED,
    )(notAdded);
    const holdersNotRemoved = mapResultsToHolderItems(
      holderStatuses.NOT_REMOVED,
    )(notRemoved);

    const holderStoreOperations: $ReadOnlyArray<HolderStoreOperation> = [
      { type: 'remove_holders', payload: { hashes: [...removedBlobHashes] } },
      createReplaceHolderOperation([
        ...holdersAdded,
        ...holdersNotAdded,
        ...holdersNotRemoved,
      ]),
    ];
    return {
      holderStore: processHolderStoreOperations(store, holderStoreOperations),
      holderStoreOperations,
    };
  }
  return { holderStore: store, holderStoreOperations: [] };
}

export { reduceHolderStore };
