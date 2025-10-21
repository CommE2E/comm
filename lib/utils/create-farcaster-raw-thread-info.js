// @flow

import { values } from './objects.js';
import {
  getFarcasterRolePermissionsBlobs,
  getFarcasterRolePermissionsBlobsFromConversation,
  nonMemberPermissions,
} from '../permissions/farcaster-permissions.js';
import { specialRoles } from '../permissions/special-roles.js';
import {
  getAllThreadPermissions,
  makePermissionsBlob,
} from '../permissions/thread-permissions.js';
import { generatePendingThreadColor } from '../shared/color-utils.js';
import type {
  FarcasterConversation,
  FarcasterConversationInvitee,
  FarcasterInboxConversation,
} from '../shared/farcaster/farcaster-conversation-types.js';
import {
  farcasterThreadIDFromConversationID,
  getFIDFromUserID,
} from '../shared/id-utils.js';
import { stringForUserExplicit } from '../shared/user-utils.js';
import type { AuxUserStore } from '../types/aux-user-types.js';
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
import type { FarcasterThreadType } from '../types/thread-types-enum.js';
import { farcasterThreadTypes } from '../types/thread-types-enum.js';

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
  +inviteeIDs: $ReadOnlySet<string>,
  +viewerAccess: 'read' | 'read-write' | 'admin',
  +muted: boolean,
  +unread: boolean,
  +name: string,
  +description: string,
  +createdAt: number,
  +pinnedCount: number,
  +pinnedMessageIDs: $ReadOnlyArray<string>,
  +avatar: ?ClientAvatar,
  +category: 'default' | 'archived' | 'request',
};

function createMembersAndCurrentUser(options: {
  +threadID: string,
  +permissionBlobs: {
    +Members: ThreadRolePermissionsBlob,
    +Admins: ?ThreadRolePermissionsBlob,
  },
  +memberIDs: $ReadOnlyArray<string>,
  +adminIDs: $ReadOnlySet<string>,
  +inviteeIDs: $ReadOnlySet<string>,
  +currentUserOptions: {
    +isAdmin: boolean,
    +unread: boolean,
    +muted: boolean,
  },
  +threadType: FarcasterThreadType,
  +category: 'default' | 'archived' | 'request',
}) {
  const {
    threadID,
    permissionBlobs,
    memberIDs,
    adminIDs,
    inviteeIDs,
    currentUserOptions,
    threadType,
  } = options;
  const inviteeRole: RoleInfo = {
    ...minimallyEncodeRoleInfo({
      id: `${threadID}/invitee/role`,
      name: 'Invitees',
      permissions: permissionBlobs.Members,
      isDefault: false,
    }),
    specialRole: specialRoles.INVITEE_ROLE,
  };
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
  if (threadType === farcasterThreadTypes.FARCASTER_GROUP) {
    roles[inviteeRole.id] = inviteeRole;
  }

  const members = memberIDs.map(fid => {
    let role = membersRole.id;
    if (inviteeIDs.has(fid)) {
      role = inviteeRole.id;
    } else if (adminIDs.has(fid) && adminsRole) {
      role = adminsRole.id;
    }
    return {
      id: fid,
      // This flag was introduced for sidebars to show who replied to a thread.
      // Now it doesn't seem to be used anywhere. Regardless, for Farcaster
      // threads its value doesn't matter.
      isSender: true,
      minimallyEncoded: true,
      role,
    };
  });

  let currentUserRole = null;
  let permissionsBlob;
  if (options.category === 'request') {
    permissionsBlob = nonMemberPermissions();
  } else {
    currentUserRole =
      currentUserOptions.isAdmin && adminsRole ? adminsRole : membersRole;
    permissionsBlob =
      currentUserOptions.isAdmin && permissionBlobs.Admins
        ? permissionBlobs.Admins
        : permissionBlobs.Members;
  }

  const background = options.category === 'request' || currentUserOptions.muted;
  const currentUser: ThreadCurrentUserInfo =
    minimallyEncodeThreadCurrentUserInfo({
      role: currentUserRole?.id,
      permissions: createPermissionsInfo(permissionsBlob, threadID, threadType),
      subscription: {
        home: !background,
        pushNotifs: !background,
      },
      unread: currentUserOptions.unread,
    });
  return { members, currentUser, roles };
}

function innerCreateFarcasterRawThreadInfo(
  threadData: FarcasterThreadData,
): FarcasterRawThreadInfo {
  const threadID = threadData.threadID;
  const threadType = threadData.isGroup
    ? farcasterThreadTypes.FARCASTER_GROUP
    : farcasterThreadTypes.FARCASTER_PERSONAL;
  const permissionBlobs = threadData.permissionBlobs;

  const { members, roles, currentUser } = createMembersAndCurrentUser({
    threadID,
    permissionBlobs,
    memberIDs: threadData.memberIDs,
    adminIDs: threadData.adminIDs,
    inviteeIDs: threadData.inviteeIDs,
    currentUserOptions: {
      isAdmin: threadData.viewerAccess === 'admin',
      unread: threadData.unread,
      muted: threadData.muted,
    },
    threadType,
    category: threadData.category,
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
    pinnedMessageIDs: threadData.pinnedMessageIDs,
  };
}

function createFarcasterRawThreadInfo(
  conversation: FarcasterConversation,
  invitees: $ReadOnlyArray<FarcasterConversationInvitee>,
): FarcasterRawThreadInfo {
  const threadID = farcasterThreadIDFromConversationID(
    conversation.conversationId,
  );
  const removedUsers = new Set(conversation.removedFids);
  const invitedUsers = invitees.map(invitee => invitee.invitee);
  const allParticipants = [...conversation.participants, ...invitedUsers];
  const memberIDs = allParticipants
    .filter(p => !removedUsers.has(p.fid))
    .map(p => `${p.fid}`);
  const adminIDs = new Set(conversation.adminFids.map(fid => `${fid}`));
  const inviteeIDs = new Set(invitees.map(invitee => `${invitee.invitee.fid}`));
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
  const description = conversation.description ?? '';
  if (!conversation.isGroup) {
    const otherUserName =
      conversation.viewerContext.counterParty?.username ??
      conversation.viewerContext.counterParty?.displayName ??
      'anonymous';
    name = otherUserName;
  }
  const pinnedMessageIDs = conversation.pinnedMessages.map(
    message => message.messageId,
  );

  const threadData: FarcasterThreadData = {
    threadID,
    isGroup: conversation.isGroup,
    permissionBlobs:
      getFarcasterRolePermissionsBlobsFromConversation(conversation),
    memberIDs,
    adminIDs,
    inviteeIDs,
    viewerAccess: conversation.viewerContext.access,
    muted: conversation.viewerContext.muted,
    unread,
    createdAt: conversation.createdAt,
    pinnedCount: conversation.pinnedMessages.length,
    pinnedMessageIDs,
    avatar,
    name,
    description,
    category: conversation.viewerContext.category,
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
  const name = stringForUserExplicit(otherUser);
  const description = '';
  const threadData: FarcasterThreadData = {
    threadID: threadInfo.id,
    isGroup: false,
    permissionBlobs,
    memberIDs,
    adminIDs: new Set(),
    inviteeIDs: new Set(),
    viewerAccess: 'read-write',
    muted: false,
    unread: false,
    name,
    description,
    createdAt: threadInfo.creationTime,
    pinnedCount: threadInfo.pinnedCount ?? 0,
    avatar: null,
    category: 'default',
    pinnedMessageIDs: threadInfo.pinnedMessageIDs ?? [],
  };

  return innerCreateFarcasterRawThreadInfo(threadData);
}

function createUpdatedThread(
  threadInfo: FarcasterRawThreadInfo,
  conversation: FarcasterInboxConversation,
  currentUserFID: string,
  auxUserStore: AuxUserStore,
):
  | { +result: 'unchanged' }
  | { +result: 'refetch', +conversationID: string }
  | { +result: 'updated', +threadInfo: FarcasterRawThreadInfo } {
  let updatedThreadInfo = threadInfo;

  if (conversation.name && conversation.name !== threadInfo.name) {
    updatedThreadInfo = { ...updatedThreadInfo, name: conversation.name };
  }

  if (conversation.description !== threadInfo.description) {
    updatedThreadInfo = {
      ...updatedThreadInfo,
      description: conversation.description ?? '',
    };
  }

  let avatarURI;
  if (conversation.isGroup) {
    avatarURI = conversation.photoUrl;
  } else {
    avatarURI = conversation.viewerContext.counterParty?.pfp?.url;
  }
  if (!avatarURI && threadInfo.avatar) {
    updatedThreadInfo = { ...updatedThreadInfo, avatar: null };
  } else if (avatarURI && avatarURI !== threadInfo.avatar?.uri) {
    updatedThreadInfo = {
      ...updatedThreadInfo,
      avatar: { type: 'image', uri: avatarURI },
    };
  }

  const conversationIsUnread =
    conversation.viewerContext.unreadCount > 0 ||
    conversation.viewerContext.manuallyMarkedUnread;

  if (
    conversation.isGroup ||
    (!threadInfo.currentUser.role &&
      conversation.viewerContext.category !== 'request')
  ) {
    const adminIDs = new Set(conversation.adminFids.map(fid => `${fid}`));
    const adminsRole = values(threadInfo.roles).find(
      role => role.specialRole === specialRoles.ADMIN_ROLE,
    );
    const threadAdminUserFIDs = threadInfo.members
      .filter(member => member.role === adminsRole?.id)
      .map(member => getFIDFromUserID(member.id, auxUserStore.auxUserInfos))
      .filter(Boolean);

    if (
      adminsRole &&
      (adminIDs.size !== threadAdminUserFIDs.length ||
        threadAdminUserFIDs.some(id => !adminIDs.has(id)))
    ) {
      return { result: 'refetch', conversationID: conversation.conversationId };
    }
  }

  if (updatedThreadInfo.currentUser.unread !== conversationIsUnread) {
    updatedThreadInfo = {
      ...updatedThreadInfo,
      currentUser: {
        ...updatedThreadInfo.currentUser,
        unread: conversationIsUnread,
      },
    };
  }

  const threadIsMuted =
    !threadInfo.currentUser.subscription.home ||
    !threadInfo.currentUser.subscription.pushNotifs;
  const shouldBeMuted =
    conversation.viewerContext.category === 'request' ||
    conversation.viewerContext.muted;
  if (threadIsMuted !== shouldBeMuted) {
    updatedThreadInfo = {
      ...updatedThreadInfo,
      currentUser: {
        ...updatedThreadInfo.currentUser,
        subscription: {
          home: !shouldBeMuted,
          pushNotifs: !shouldBeMuted,
        },
      },
    };
  }

  if (threadInfo === updatedThreadInfo) {
    return { result: 'unchanged' };
  }
  return {
    result: 'updated',
    threadInfo: updatedThreadInfo,
  };
}

export {
  createFarcasterRawThreadInfo,
  createFarcasterRawThreadInfoPersonal,
  createUpdatedThread,
};
