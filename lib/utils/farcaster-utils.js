// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { useUserIdentityCache } from '../components/user-identity-cache.react.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

const DISABLE_CONNECT_FARCASTER_ALERT = false;
const NO_FID_METADATA = 'NONE';
const NO_FID_DCS_METADATA = 'NONE';

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

function useCurrentUserFIDDCs(): ?boolean {
  // There is a distinction between null & undefined for the fid DCs value.
  // If the fid DCs is null this means that the user has decided NOT to set
  // a Farcaster DCs association. If the fid DCs is undefined this means that
  // the user has not yet been prompted to set a Farcaster DCs association.
  const currentUserFIDDCs = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_FID_DCS
      ] ?? undefined,
  );

  if (currentUserFIDDCs === NO_FID_DCS_METADATA) {
    return null;
  }

  return currentUserFIDDCs === 'true';
}

function useSetLocalFID(): (fid: ?string) => void {
  const dispatch = useDispatch();
  const { invalidateCacheForUser } = useUserIdentityCache();
  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  return React.useCallback(
    (fid: ?string) => {
      // If we're unsetting the FID, we should set it to NO_FID_METADATA to
      // avoid prompting the user for it again
      const fidToSet = fid ?? NO_FID_METADATA;
      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_FID,
          data: fidToSet,
        },
      });
      if (currentUserID) {
        invalidateCacheForUser(currentUserID);
      }
    },
    [dispatch, currentUserID, invalidateCacheForUser],
  );
}

function useSetLocalFIDDCs(): (connected: ?boolean) => void {
  const dispatch = useDispatch();
  const { invalidateCacheForUser } = useUserIdentityCache();
  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  return React.useCallback(
    (connected: ?boolean) => {
      // If we're unsetting the FID DCs, we should set it to
      // NO_FID_DCS_METADATA to avoid prompting the user for it again
      const fidDCsToSet =
        connected === null ? NO_FID_DCS_METADATA : String(connected);
      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_FID_DCS,
          data: fidDCsToSet,
        },
      });
      if (currentUserID) {
        invalidateCacheForUser(currentUserID);
      }
    },
    [dispatch, currentUserID, invalidateCacheForUser],
  );
}

function useLinkFID(): (fid: string) => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { linkFarcasterAccount } = identityClient;

  const setLocalFID = useSetLocalFID();

  return React.useCallback(
    async (fid: string) => {
      await linkFarcasterAccount(fid);
      setLocalFID(fid);
    },
    [setLocalFID, linkFarcasterAccount],
  );
}

function useUnlinkFID(): () => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { unlinkFarcasterAccount } = identityClient;

  const setLocalFID = useSetLocalFID();
  const setLocalFIDDCs = useSetLocalFIDDCs();

  return React.useCallback(async () => {
    await unlinkFarcasterAccount();
    setLocalFID(null);
    setLocalFIDDCs(null);
  }, [setLocalFID, setLocalFIDDCs, unlinkFarcasterAccount]);
}

function useLinkFIDDCs(): (
  fid: string,
  farcasterDCsToken: string,
) => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { linkFarcasterDCsAccount } = identityClient;

  const setLocalFIDDCs = useSetLocalFIDDCs();

  return React.useCallback(
    async (fid: string, farcasterDCsToken: string) => {
      await linkFarcasterDCsAccount(fid, farcasterDCsToken);
      setLocalFIDDCs(true);
    },
    [setLocalFIDDCs, linkFarcasterDCsAccount],
  );
}

export {
  DISABLE_CONNECT_FARCASTER_ALERT,
  NO_FID_METADATA,
  NO_FID_DCS_METADATA,
  useCurrentUserFID,
  useCurrentUserFIDDCs,
  useSetLocalFID,
  useSetLocalFIDDCs,
  useLinkFID,
  useUnlinkFID,
  useLinkFIDDCs,
};
