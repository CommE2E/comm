// @flow

import * as React from 'react';

import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { getConfig } from '../utils/config.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function SyncStoreVersionHandler(): React.Node {
  const syncedMetadataStoreVersion = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.STORE_VERSION
      ] ?? undefined,
  );
  const loggedIn = useSelector(isLoggedIn);
  const stateLoaded = usePersistedStateLoaded();

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const stateVersion = getConfig().platformDetails.stateVersion?.toString();
    if (
      !stateLoaded ||
      !stateVersion ||
      stateVersion === syncedMetadataStoreVersion
    ) {
      return;
    }

    dispatch({
      type: setSyncedMetadataEntryActionType,
      payload: {
        name: syncedMetadataNames.STORE_VERSION,
        data: stateVersion.toString(),
      },
    });
  }, [dispatch, loggedIn, stateLoaded, syncedMetadataStoreVersion]);

  return null;
}

export { SyncStoreVersionHandler };
