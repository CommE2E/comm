// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { getConfig } from './config.js';
import { getContentSigningKey } from './crypto-utils.js';
import { useDispatch, useSelector } from './redux-utils.js';
import {
  setSyncedMetadataEntryActionType,
  setSyncedMetadataEntriesActionType,
} from '../actions/synced-metadata-actions.js';
import { useUserIdentityCache } from '../components/user-identity-cache.react.js';
import { getOwnPeerDevices } from '../selectors/user-selectors.js';
import { processFarcasterOpsActionType } from '../shared/farcaster/farcaster-actions.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { PeerToPeerContext } from '../tunnelbroker/peer-to-peer-context.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import { outboundP2PMessageStatuses } from '../types/sqlite-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import type { FarcasterConnectionUpdated } from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { updateTypes } from '../types/update-types-enum.js';

const DISABLE_CONNECT_FARCASTER_ALERT = false;
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

function useCurrentUserSupportsDCs(): boolean {
  const currentUserFIDDCs = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.CURRENT_USER_SUPPORTS_DCS
      ] ?? undefined,
  );

  return currentUserFIDDCs === 'true';
}

function useFarcasterDCsLoaded(): ?boolean {
  const farcasterDCsLoaded = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.FARCASTER_DCS_LOADED
      ],
  );

  if (farcasterDCsLoaded === 'true') {
    return true;
  } else if (farcasterDCsLoaded === 'false') {
    return false;
  }
  return undefined;
}

function useFarcasterDCsSyncCanceled(): boolean {
  const farcasterDCsSyncCanceled = useSelector(
    state =>
      state.syncedMetadataStore.syncedMetadata[
        syncedMetadataNames.FARCASTER_DCS_SYNC_CANCELED
      ],
  );

  return farcasterDCsSyncCanceled === 'true';
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

function useSetLocalCurrentUserSupportsDCs(): (connected: boolean) => void {
  const dispatch = useDispatch();
  const { invalidateCacheForUser } = useUserIdentityCache();
  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  return React.useCallback(
    (connected: boolean) => {
      const connectionStatus = String(connected);
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

function useSetFarcasterDCsSyncStatus(): {
  +setLoaded: (loaded: boolean) => void,
  +setCanceled: (canceled: boolean) => void,
} {
  const dispatch = useDispatch();

  const setLoaded = React.useCallback(
    (loaded: boolean) => {
      const entries: Array<{ +name: string, +data: string }> = [
        {
          name: syncedMetadataNames.FARCASTER_DCS_LOADED,
          data: String(loaded),
        },
      ];
      if (!loaded) {
        entries.push({
          name: syncedMetadataNames.FARCASTER_DCS_SYNC_CANCELED,
          data: String(false),
        });
      }
      dispatch({
        type: setSyncedMetadataEntriesActionType,
        payload: { entries },
      });
    },
    [dispatch],
  );

  const setCanceled = React.useCallback(
    (canceled: boolean) => {
      const entries: Array<{ +name: string, +data: string }> = [
        {
          name: syncedMetadataNames.FARCASTER_DCS_SYNC_CANCELED,
          data: String(canceled),
        },
      ];
      if (canceled) {
        entries.push({
          name: syncedMetadataNames.FARCASTER_DCS_LOADED,
          data: String(true),
        });
      }
      dispatch({
        type: setSyncedMetadataEntriesActionType,
        payload: { entries },
      });
    },
    [dispatch],
  );

  return React.useMemo(
    () => ({ setLoaded, setCanceled }),
    [setLoaded, setCanceled],
  );
}

function useFarcasterDCsSyncCancellationRef(): { +current: boolean } {
  const isCanceled = useFarcasterDCsSyncCanceled();
  const canceledRef = React.useRef(isCanceled);
  React.useEffect(() => {
    canceledRef.current = isCanceled;
  }, [isCanceled]);
  return canceledRef;
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
      await broadcastConnectionStatus(fid, false);
    },
    [linkFarcasterAccount, setLocalFID, broadcastConnectionStatus],
  );
}

function useClearFarcasterThreads(): () => void {
  const threads = useSelector(state => state.threadStore.threadInfos);
  const dispatch = useDispatch();
  const { setLoaded } = useSetFarcasterDCsSyncStatus();
  return React.useCallback(() => {
    setLoaded(false);
    const farcasterThreadIDs = Object.values(threads)
      .filter(thread => thread.farcaster)
      .map(thread => thread.id);
    const time = Date.now();
    const updates = farcasterThreadIDs.map(threadID => ({
      type: updateTypes.DELETE_THREAD,
      id: uuid.v4(),
      time,
      threadID,
    }));
    dispatch({
      type: processFarcasterOpsActionType,
      payload: {
        rawMessageInfos: [],
        updateInfos: updates,
      },
    });
  }, [dispatch, setLoaded, threads]);
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
  const clearFarcasterThreads = useClearFarcasterThreads();

  return React.useCallback(async () => {
    await unlinkFarcasterAccount();
    setLocalFID(undefined);
    setLocalDCsSupport(false);
    await broadcastConnectionStatus(null, false);
    clearFarcasterThreads();
  }, [
    unlinkFarcasterAccount,
    setLocalFID,
    setLocalDCsSupport,
    broadcastConnectionStatus,
    clearFarcasterThreads,
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
  const { setLoaded } = useSetFarcasterDCsSyncStatus();

  return React.useCallback(
    async (fid: string, farcasterDCsToken: string) => {
      await linkFarcasterDCsAccount(fid, farcasterDCsToken);
      setLocalDCsSupport(true);
      setLoaded(false);
      await broadcastConnectionStatus(fid, true);
    },
    [
      linkFarcasterDCsAccount,
      setLocalDCsSupport,
      setLoaded,
      broadcastConnectionStatus,
    ],
  );
}

function useBroadcastUpdateFarcasterConnectionStatus() {
  const peerToPeerContext = React.useContext(PeerToPeerContext);
  const { processDBStoreOperations } = getConfig().sqliteAPI;

  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const userDevices = useSelector(getOwnPeerDevices);
  return React.useCallback(
    async (farcasterID: ?string, hasDCsToken: boolean) => {
      if (!currentUserID) {
        return;
      }
      invariant(peerToPeerContext, 'PeerToPeerContext should be set');
      const thisDeviceID = await getContentSigningKey();
      const message: FarcasterConnectionUpdated = {
        type: 'FARCASTER_CONNECTION_UPDATED',
        farcasterID,
        hasDCsToken,
      };
      const messageString = JSON.stringify(message);
      const timestamp = new Date().getTime().toString();
      const messages = userDevices
        .filter(device => device.deviceID !== thisDeviceID)
        .map(device => ({
          messageID: uuid.v4(),
          deviceID: device.deviceID,
          userID: currentUserID,
          timestamp,
          plaintext: messageString,
          ciphertext: '',
          status: outboundP2PMessageStatuses.persisted,
          supportsAutoRetry: true,
        }));
      await processDBStoreOperations(
        { outboundP2PMessages: messages },
        databaseIdentifier.MAIN,
      );
      await peerToPeerContext.processOutboundMessages(
        messages.map(m => m.messageID),
      );
    },
    [currentUserID, peerToPeerContext, processDBStoreOperations, userDevices],
  );
}

function createFarcasterDCsAuthMessage(fid: string, nonce: string): string {
  return (
    `This signature grants access to read and write your ` +
    `Farcaster Direct Casts.

In most cases, this message should get signed invisibly, without your ` +
    `interaction.

If you are seeing this text from a signing prompt in your wallet, tread ` +
    `very carefully.

Direct cast authorization for Farcaster FID ${fid}

URI: https://client.farcaster.xyz/v2/get-dc-auth-token
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`
  );
}

function useCancelFarcasterDCsSync(): () => void {
  const { setCanceled } = useSetFarcasterDCsSyncStatus();
  const { showAlert } = getConfig();

  return React.useCallback(() => {
    showAlert(
      'Cancel Farcaster fetching',
      'Are you sure you want to cancel the Farcaster conversations fetching?' +
        ' You can always restart it later from your profile screen.',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => setCanceled(true),
        },
      ],
      {
        cancelable: true,
      },
    );
  }, [setCanceled, showAlert]);
}

export {
  DISABLE_CONNECT_FARCASTER_ALERT,
  NO_FID_METADATA,
  useCurrentUserFID,
  useCurrentUserSupportsDCs,
  useFarcasterDCsLoaded,
  useFarcasterDCsSyncCanceled,
  useSetLocalFID,
  useSetLocalCurrentUserSupportsDCs,
  useSetFarcasterDCsSyncStatus,
  useLinkFID,
  useUnlinkFID,
  useLinkFarcasterDCs,
  createFarcasterDCsAuthMessage,
  useClearFarcasterThreads,
  useFarcasterDCsSyncCancellationRef,
  useCancelFarcasterDCsSync,
};
