// @flow

import * as React from 'react';

import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
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

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const { stateVersion } = getConfig().platformDetails;
    if (!stateVersion || stateVersion === syncedMetadataStoreVersion) {
      return;
    }

    dispatch({
      type: setSyncedMetadataEntryActionType,
      payload: {
        name: syncedMetadataNames.STORE_VERSION,
        data: stateVersion.toString(),
      },
    });
  }, [dispatch, loggedIn, syncedMetadataStoreVersion]);

  return null;
}

export { SyncStoreVersionHandler };
