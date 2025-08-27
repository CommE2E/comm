// @flow

import { getFarcasterRolePermissionsBlobsFromConversation } from '../permissions/farcaster-permissions.js';
import { specialRoles } from '../permissions/special-roles.js';
import {
  getAllThreadPermissions,
  makePermissionsBlob,
} from '../permissions/thread-permissions.js';
import { generatePendingThreadColor } from '../shared/color-utils.js';
import type { FarcasterConversation } from '../shared/farcaster/farcaster-conversation-types.js';
import { farcasterThreadIDFromConversationID } from '../shared/id-utils.js';
import type { ClientAvatar } from '../types/avatar-types.js';
import type {
  FarcasterRawThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { ThreadRolePermissionsBlob } from '../types/thread-permission-types.js';
import { farcasterThreadTypes } from '../types/thread-types-enum.js';
import type { FarcasterThreadType } from '../types/thread-types-enum.js';

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
  const permissionBlobs =
    getFarcasterRolePermissionsBlobsFromConversation(conversation);

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

  const removedUsers = new Set(conversation.removedFids);
  const userIDs = conversation.participants
    .filter(p => !removedUsers.has(p.fid))
    .map(p => `${p.fid}`);
  const adminIDs = new Set(conversation.adminFids.map(fid => `${fid}`));

  const members = userIDs.map(fid => ({
    id: fid,
    // This flag was introduced for sidebars to show who replied to a thread.
    // Now it doesn't seem to be used anywhere. Regardless, for Farcaster
    // threads its value doesn't matter.
    isSender: true,
    minimallyEncoded: true,
    role: adminIDs.has(fid) && adminsRole ? adminsRole.id : membersRole.id,
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

  let avatar: ?ClientAvatar;
  if (conversation.isGroup) {
    avatar = conversation.photoUrl
      ? { type: 'image', uri: conversation.photoUrl }
      : null;
  } else {
    const uri = conversation.viewerContext.counterParty?.pfp?.url;
    avatar = uri ? { type: 'image', uri } : null;
  }

  return {
    farcaster: true,
    id: threadID,
    type: threadType,
    name: conversation.name,
    avatar,
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

export { createFarcasterRawThreadInfo };
