// @flow

import { createSelector } from 'reselect';

import type { AppState } from '../types/redux-types.js';
import {
  type SyncedMetadata,
  syncedMetadataNames,
} from '../types/synced-metadata-types.js';

const currentUserFIDSelector: (state: AppState) => ?string = createSelector(
  (state: AppState) => state.syncedMetadataStore.syncedMetadata,
  (syncedMetadata: SyncedMetadata) => {
    const currentUserFID =
      syncedMetadata[syncedMetadataNames.CURRENT_USER_FID] ?? null;
    return currentUserFID;
  },
);

export { currentUserFIDSelector };
