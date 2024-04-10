// @flow

import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useCurrentUserFID(): ?string {
  return useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_FID
      ] ?? null,
  );
}

export { useCurrentUserFID };
