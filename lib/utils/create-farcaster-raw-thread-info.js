// @flow

import {
  getFarcasterRolePermissionsBlobs,
  getFarcasterRolePermissionsBlobsFromConversation,
} from '../permissions/farcaster-permissions.js';
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
  ThreadInfo,
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

type FarcasterThreadData = {
  +threadID: string,
  +isGroup: boolean,
  +permissionBlobs: {
    +Members: ThreadRolePermissionsBlob,
    +Admins: ?ThreadRolePermissionsBlob,
  },
  +memberIDs: $ReadOnlyArray<string>,
  +adminIDs: $ReadOnlySet<string>,
  +viewerAccess: 'read' | 'read-write' | 'admin',
  +muted: boolean,
  +unread: boolean,
  +name: string,
  +description: string,
  +createdAt: number,
  +pinnedCount: number,
  +avatar: ?ClientAvatar,
};

function innerCreateFarcasterRawThreadInfo(
  threadData: FarcasterThreadData,
): FarcasterRawThreadInfo {
  const threadID = threadData.threadID;
  const threadType = threadData.isGroup
    ? farcasterThreadTypes.FARCASTER_GROUP
    : farcasterThreadTypes.FARCASTER_PERSONAL;
  const permissionBlobs = threadData.permissionBlobs;

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

  const members = threadData.memberIDs.map(fid => ({
    id: fid,
    // This flag was introduced for sidebars to show who replied to a thread.
    // Now it doesn't seem to be used anywhere. Regardless, for Farcaster
    // threads its value doesn't matter.
    isSender: true,
    minimallyEncoded: true,
    role:
      threadData.adminIDs.has(fid) && adminsRole
        ? adminsRole.id
        : membersRole.id,
  }));

  const currentUserRole =
    threadData.viewerAccess === 'admin' && adminsRole
      ? adminsRole
      : membersRole;
  const currentUser: ThreadCurrentUserInfo =
    minimallyEncodeThreadCurrentUserInfo({
      role: currentUserRole.id,
      permissions: createPermissionsInfo(
        threadData.viewerAccess === 'admin' && permissionBlobs.Admins
          ? permissionBlobs.Admins
          : permissionBlobs.Members,
        threadID,
        threadType,
      ),
      subscription: {
        home: !threadData.muted,
        pushNotifs: !threadData.muted,
      },
      unread: threadData.unread,
    });

  return {
    farcaster: true,
    id: threadData.threadID,
    type: threadType,
    name: threadData.name,
    avatar: threadData.avatar,
    description: threadData.description,
    color: generatePendingThreadColor(threadData.memberIDs),
    parentThreadID: null,
    community: null,
    creationTime: threadData.createdAt,
    repliesCount: 0,
    pinnedCount: threadData.pinnedCount,
    minimallyEncoded: true,
    members,
    roles,
    currentUser,
  };
}

function createFarcasterRawThreadInfo(
  conversation: FarcasterConversation,
): FarcasterRawThreadInfo {
  const threadID = farcasterThreadIDFromConversationID(
    conversation.conversationId,
  );
  const removedUsers = new Set(conversation.removedFids);
  const memberIDs = conversation.participants
    .filter(p => !removedUsers.has(p.fid))
    .map(p => `${p.fid}`);
  const adminIDs = new Set(conversation.adminFids.map(fid => `${fid}`));
  const unread =
    conversation.unreadCount > 0 ||
    conversation.viewerContext.manuallyMarkedUnread;
  let avatar: ?ClientAvatar;
  if (conversation.isGroup) {
    avatar = conversation.photoUrl
      ? { type: 'image', uri: conversation.photoUrl }
      : null;
  } else {
    const uri = conversation.viewerContext.counterParty?.pfp?.url;
    avatar = uri ? { type: 'image', uri } : null;
  }
  let name = conversation.name ?? '';
  let description = conversation.description ?? '';
  if (!conversation.isGroup) {
    //  For a 1-1 conversation, follow the Farcaster approach and show user's
    //  name as the conversation name
    const otherUserName =
      conversation.viewerContext.counterParty?.displayName ??
      conversation.viewerContext.counterParty?.username ??
      'anonymous';
    name = otherUserName;
    description = `Your Direct Cast with ${otherUserName}`;
  }
  const threadData: FarcasterThreadData = {
    threadID,
    isGroup: conversation.isGroup,
    permissionBlobs:
      getFarcasterRolePermissionsBlobsFromConversation(conversation),
    memberIDs,
    adminIDs,
    viewerAccess: conversation.viewerContext.access,
    muted: conversation.viewerContext.muted,
    unread,
    createdAt: conversation.createdAt,
    pinnedCount: conversation.pinnedMessages.length,
    avatar,
    name,
    description,
  };

  return innerCreateFarcasterRawThreadInfo(threadData);
}

function createFarcasterRawThreadInfoPersonal(
  threadInfo: ThreadInfo,
): FarcasterRawThreadInfo {
  const threadType = farcasterThreadTypes.FARCASTER_PERSONAL;
  const permissionBlobs = getFarcasterRolePermissionsBlobs(
    threadType,
    false,
    false,
  );
  const memberIDs = threadInfo.members.map(member => member.id);
  const otherUser = threadInfo.members.find(user => !user.isViewer);
  const name = otherUser?.username ?? 'anonymous';
  const description = `Your Direct Cast with ${name}`;
  const threadData: FarcasterThreadData = {
    threadID: threadInfo.id,
    isGroup: false,
    permissionBlobs,
    memberIDs,
    adminIDs: new Set(),
    viewerAccess: 'read-write',
    muted: false,
    unread: false,
    name,
    description,
    createdAt: threadInfo.creationTime,
    pinnedCount: threadInfo.pinnedCount ?? 0,
    avatar: null,
  };

  return innerCreateFarcasterRawThreadInfo(threadData);
}

export { createFarcasterRawThreadInfo, createFarcasterRawThreadInfoPersonal };
