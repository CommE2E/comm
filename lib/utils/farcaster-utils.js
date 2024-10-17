// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

const DISABLE_CONNECT_FARCASTER_ALERT = true;
const NO_FID_METADATA = 'NONE';

function useCurrentUserFID(): ?string {
  // There is a distinction between null & undefined for the fid value.
  // If the fid is null this means that the user has decided NOT to set
  // a Farcaster association. If the fid is undefined this means that
  // the user has not yet been prompted to set a Farcaster association.
  const currentUserFID = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_FID
      ] ?? undefined,
  );

  if (currentUserFID === NO_FID_METADATA) {
    return null;
  }

  return currentUserFID;
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
      type: setSyncedMetadataEntryActionType,
      payload: {
        name: syncedMetadataNames.CURRENT_USER_FID,
        data: NO_FID_METADATA,
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
