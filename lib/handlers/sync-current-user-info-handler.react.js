// @flow

import * as React from 'react';

import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function SyncCurrentUserInfoHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const stateLoaded = usePersistedStateLoaded();
  const dispatch = useDispatch();

  const syncedMetadataCurrentUserInfo = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_INFO
      ] ?? undefined,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const currentUserInfoIsSynced = React.useMemo(
    () => syncedMetadataCurrentUserInfo === JSON.stringify(currentUserInfo),
    [currentUserInfo, syncedMetadataCurrentUserInfo],
  );

  React.useEffect(() => {
    if (!loggedIn) {
      return;
    }

    if (!currentUserInfoIsSynced) {
      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_INFO,
          data: JSON.stringify(currentUserInfo),
        },
      });
    }
  }, [
    currentUserInfo,
    currentUserInfoIsSynced,
    dispatch,
    loggedIn,
    stateLoaded,
  ]);

  return null;
}

export { SyncCurrentUserInfoHandler };
