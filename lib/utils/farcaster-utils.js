// @flow

import {
  type SyncedMetadata,
  syncedMetadataNames,
} from '../types/synced-metadata-types.js';

function getCurrentUserFID(syncedMetadata: SyncedMetadata): ?string {
  return syncedMetadata[syncedMetadataNames.CURRENT_USER_FID] ?? null;
}

export { getCurrentUserFID };
