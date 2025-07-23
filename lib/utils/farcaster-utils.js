// @flow

import invariant from 'invariant';
import * as React from 'react';

import { getContentSigningKey } from './crypto-utils.js';
import { useSelector, useDispatch } from './redux-utils.js';
import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { useUserIdentityCache } from '../components/user-identity-cache.react.js';
import { getOwnPeerDevices } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';

const DISABLE_CONNECT_FARCASTER_ALERT = false;
const NO_FID_METADATA = 'NONE';
const NO_DCS_SUPPORT_METADATA = 'NONE';

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

function useCurrentUserSupportsDCs(): ?boolean {
  // There is a distinction between null & undefined for the fid DCs value.
  // If the fid DCs is null this means that the user has decided NOT to set
  // a Farcaster DCs association. If the fid DCs is undefined this means that
  // the user has not yet been prompted to set a Farcaster DCs association.
  const currentUserFIDDCs = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_SUPPORTS_DCS
      ] ?? undefined,
  );

  if (currentUserFIDDCs === NO_DCS_SUPPORT_METADATA) {
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

function useSetLocalCurrentUserSupportsDCs(): (connected: ?boolean) => void {
  const dispatch = useDispatch();
  const { invalidateCacheForUser } = useUserIdentityCache();
  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  return React.useCallback(
    (connected: ?boolean) => {
      // If we're unsetting the DCs support, we should set it to
      // NO_DCS_SUPPORT_METADATA to avoid prompting the user for it again
      const connectionStatus =
        connected === null ? NO_DCS_SUPPORT_METADATA : String(connected);
      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_SUPPORTS_DCS,
          data: connectionStatus,
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
  const broadcastConnectionStatus =
    useBroadcastUpdateFarcasterConnectionStatus();

  return React.useCallback(
    async (fid: string) => {
      await linkFarcasterAccount(fid);
      setLocalFID(fid);
      await broadcastConnectionStatus(fid, null);
    },
    [linkFarcasterAccount, setLocalFID, broadcastConnectionStatus],
  );
}

function useUnlinkFID(): () => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { unlinkFarcasterAccount } = identityClient;

  const setLocalFID = useSetLocalFID();
  const setLocalDCsSupport = useSetLocalCurrentUserSupportsDCs();
  const broadcastConnectionStatus =
    useBroadcastUpdateFarcasterConnectionStatus();

  return React.useCallback(async () => {
    await unlinkFarcasterAccount();
    setLocalFID(null);
    setLocalDCsSupport(null);
    await broadcastConnectionStatus(null, null);
  }, [
    unlinkFarcasterAccount,
    setLocalFID,
    setLocalDCsSupport,
    broadcastConnectionStatus,
  ]);
}

function useLinkFarcasterDCs(): (
  fid: string,
  farcasterDCsToken: string,
) => Promise<void> {
  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'identityClientContext should be set');

  const { identityClient } = identityClientContext;
  const { linkFarcasterDCsAccount } = identityClient;

  const setLocalDCsSupport = useSetLocalCurrentUserSupportsDCs();
  const broadcastConnectionStatus =
    useBroadcastUpdateFarcasterConnectionStatus();

  return React.useCallback(
    async (fid: string, farcasterDCsToken: string) => {
      await linkFarcasterDCsAccount(fid, farcasterDCsToken);
      setLocalDCsSupport(true);
      await broadcastConnectionStatus(fid, true);
    },
    [linkFarcasterDCsAccount, setLocalDCsSupport, broadcastConnectionStatus],
  );
}

function useBroadcastUpdateFarcasterConnectionStatus() {
  const { sendMessageToDevice } = useTunnelbroker();
  const userDeviceIDs = useSelector(getOwnPeerDevices).map(
    peer => peer.deviceID,
  );
  return React.useCallback(
    async (farcasterID: ?string, hasDCsToken: ?boolean) => {
      const thisDeviceID = await getContentSigningKey();
      const message = JSON.stringify({
        type: 'FarcasterConnectionUpdated',
        farcasterID,
        hasDCsToken,
      });
      for (const deviceID of userDeviceIDs) {
        if (deviceID !== thisDeviceID) {
          void sendMessageToDevice({
            deviceID,
            payload: message,
          });
        }
      }
    },
    [sendMessageToDevice, userDeviceIDs],
  );
}

export {
  DISABLE_CONNECT_FARCASTER_ALERT,
  NO_FID_METADATA,
  NO_DCS_SUPPORT_METADATA,
  useCurrentUserFID,
  useCurrentUserSupportsDCs,
  useSetLocalFID,
  useSetLocalCurrentUserSupportsDCs,
  useLinkFID,
  useUnlinkFID,
  useLinkFarcasterDCs,
};
