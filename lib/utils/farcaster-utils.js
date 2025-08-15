// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { getConfig } from './config.js';
import { getContentSigningKey } from './crypto-utils.js';
import { useSelector, useDispatch } from './redux-utils.js';
import { farcasterIDPrefix } from './validation-utils.js';
import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { useUserIdentityCache } from '../components/user-identity-cache.react.js';
import { getFarcasterRolePermissionsBlobs } from '../permissions/farcaster-permissions.js';
import { specialRoles } from '../permissions/special-roles.js';
import {
  getAllThreadPermissions,
  makePermissionsBlob,
} from '../permissions/thread-permissions.js';
import { getOwnPeerDevices } from '../selectors/user-selectors.js';
import { generatePendingThreadColor } from '../shared/color-utils.js';
import type { FarcasterConversation } from '../shared/farcaster/farcaster-conversation-types.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { PeerToPeerContext } from '../tunnelbroker/peer-to-peer-context.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import {
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type {
  ThreadCurrentUserInfo,
  FarcasterRawThreadInfo,
  RoleInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { outboundP2PMessageStatuses } from '../types/sqlite-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import type { ThreadRolePermissionsBlob } from '../types/thread-permission-types.js';
import { farcasterThreadTypes } from '../types/thread-types-enum.js';
import type { FarcasterThreadType } from '../types/thread-types-enum.js';
import type { FarcasterConnectionUpdated } from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';

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
  const peerToPeerContext = React.useContext(PeerToPeerContext);
  const { processDBStoreOperations } = getConfig().sqliteAPI;

  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const userDevices = useSelector(getOwnPeerDevices);
  return React.useCallback(
    async (farcasterID: ?string, hasDCsToken: ?boolean) => {
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

function farcasterThreadIDFromConversationID(conversationID: string): string {
  return `${farcasterIDPrefix}${conversationID}`;
}

function createPermissionsInfo(
  permissionsBlob: ThreadRolePermissionsBlob,
  threadID: string,
  threadType: FarcasterThreadType,
) {
  return getAllThreadPermissions(
    makePermissionsBlob(permissionsBlob, null, threadID, threadType),
    threadID,
  );
}

function createFarcasterRawThreadInfo(
  conversation: FarcasterConversation,
): FarcasterRawThreadInfo {
  const threadID = farcasterThreadIDFromConversationID(
    conversation.conversationId,
  );
  const threadType = conversation.isGroup
    ? farcasterThreadTypes.FARCASTER_GROUP
    : farcasterThreadTypes.FARCASTER_PERSONAL;
  const permissionBlobs = getFarcasterRolePermissionsBlobs(conversation);

  const membersRole: RoleInfo = {
    ...minimallyEncodeRoleInfo({
      id: `${threadID}/member/role`,
      name: 'Members',
      permissions: permissionBlobs.Members,
      isDefault: true,
    }),
    specialRole: specialRoles.DEFAULT_ROLE,
  };
  const adminsRole: ?RoleInfo = permissionBlobs.Admins
    ? {
        ...minimallyEncodeRoleInfo({
          id: `${threadID}/admin/role`,
          name: 'Admins',
          permissions: permissionBlobs.Admins,
          isDefault: false,
        }),
        specialRole: specialRoles.ADMIN_ROLE,
      }
    : null;
  const roles: { [id: string]: RoleInfo } = {
    [membersRole.id]: membersRole,
  };
  if (adminsRole) {
    roles[adminsRole.id] = adminsRole;
  }

  const userIDs = conversation.participants.map(p => `${p.fid}`);
  const adminIDs = new Set(conversation.adminFids.map(fid => `${fid}`));

  const members = userIDs.map(id => ({
    id,
    // This flag was introduced for sidebars to show who replied to a thread.
    // Now it doesn't seem to be used anywhere. Regardless, for Farcaster
    // threads its value doesn't matter.
    isSender: true,
    minimallyEncoded: true,
    role: adminIDs.has(id) && adminsRole ? adminsRole.id : membersRole.id,
  }));

  const currentUserRole =
    conversation.viewerContext.access === 'admin' && adminsRole
      ? adminsRole
      : membersRole;
  const currentUser: ThreadCurrentUserInfo =
    minimallyEncodeThreadCurrentUserInfo({
      role: currentUserRole.id,
      permissions: createPermissionsInfo(
        conversation.viewerContext.access === 'admin' && permissionBlobs.Admins
          ? permissionBlobs.Admins
          : permissionBlobs.Members,
        threadID,
        threadType,
      ),
      subscription: {
        home: true,
        pushNotifs: !conversation.viewerContext.muted,
      },
      unread: conversation.viewerContext.unreadCount > 0,
    });

  return {
    farcaster: true,
    id: threadID,
    type: threadType,
    name: conversation.name,
    avatar: { type: 'farcaster' },
    description: conversation.description,
    color: generatePendingThreadColor(userIDs),
    parentThreadID: null,
    community: null,
    creationTime: conversation.createdAt,
    repliesCount: 0,
    pinnedCount: conversation.pinnedMessages.length,
    minimallyEncoded: true,
    members,
    roles,
    currentUser,
  };
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
  createFarcasterDCsAuthMessage,
  createFarcasterRawThreadInfo,
};
