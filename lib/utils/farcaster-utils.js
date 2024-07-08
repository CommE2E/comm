// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  setSyncedMetadataEntryActionType,
  clearSyncedMetadataEntryActionType,
} from '../actions/synced-metadata-actions.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

const DISABLE_CONNECT_FARCASTER_ALERT = true;
const NO_FID_METADATA = 'NONE';

function useCurrentUserFID(): ?string {
  return useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_FID
      ] ?? null,
  );
}

function useLinkFID(): (fid: string) => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { linkFarcasterAccount } = identityClient;

  const dispatch = useDispatch();

  return React.useCallback(
    async (fid: string) => {
      await linkFarcasterAccount(fid);

      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_FID,
          data: fid,
        },
      });
    },
    [dispatch, linkFarcasterAccount],
  );
}

function useUnlinkFID(): () => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { unlinkFarcasterAccount } = identityClient;

  const dispatch = useDispatch();

  return React.useCallback(async () => {
    await unlinkFarcasterAccount();

    dispatch({
      type: clearSyncedMetadataEntryActionType,
      payload: {
        name: syncedMetadataNames.CURRENT_USER_FID,
      },
    });
  }, [dispatch, unlinkFarcasterAccount]);
}

export {
  DISABLE_CONNECT_FARCASTER_ALERT,
  NO_FID_METADATA,
  useCurrentUserFID,
  useLinkFID,
  useUnlinkFID,
};
