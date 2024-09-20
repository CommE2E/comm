// @flow

import type { BlobHashAndHolder } from '../types/holder-types.js';
type MultipleBlobHolders = $ReadOnlyArray<BlobHashAndHolder>;

export const storeEstablishedHolderActionType = 'STORE_ESTABLISHED_HOLDER';
export type StoreEstablishedHolderPayload = BlobHashAndHolder;

export const processHoldersActionTypes = Object.freeze({
  started: 'PROCESS_HOLDERS_STARTED',
  success: 'PROCESS_HOLDERS_SUCCESS',
  failed: 'PROCESS_HOLDERS_FAILED',
});
export type ProcessHoldersStartedPayload = {
  holdersToAdd: MultipleBlobHolders,
  holdersToRemove: MultipleBlobHolders,
};
export type ProcessHoldersFinishedPayload = {
  added: MultipleBlobHolders,
  removed: MultipleBlobHolders,
  notAdded: MultipleBlobHolders,
  notRemoved: MultipleBlobHolders,
};
