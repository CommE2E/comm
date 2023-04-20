// @flow

import type {
  MemberInfo,
  RawThreadInfo,
  ThreadCurrentUserInfo,
  RoleInfo,
} from 'lib/types/thread-types.js';
import { threadTypes } from 'lib/types/thread-types.js';

type ThreadStoreThreadInfos = { +[id: string]: RawThreadInfo };
type TargetMemberInfo = MemberInfo | ThreadCurrentUserInfo;

const threadTypesWhereMembersRoleHasEditAvatarPermissions = new Set([
  threadTypes.SIDEBAR,
  threadTypes.LOCAL,
  threadTypes.COMMUNITY_ROOT,
  threadTypes.COMMUNITY_OPEN_SUBTHREAD,
  threadTypes.COMMUNITY_SECRET_SUBTHREAD,
]);

function addEditThreadAvatarPermissionsToUser(
  threadInfo: RawThreadInfo,
  member: TargetMemberInfo,
  threadID: string,
): TargetMemberInfo {
  let updatedPermissions;

  if (member.role && threadInfo.roles[member.role].name === 'Members') {
    updatedPermissions = {
      ...member.permissions,
      edit_thread_avatar:
        threadTypesWhereMembersRoleHasEditAvatarPermissions.has(threadInfo.type)
          ? { value: true, source: threadID }
          : { value: false, source: null },
    };
  } else if (member.permissions['edit_thread_color']) {
    updatedPermissions = {
      ...member.permissions,
      edit_thread_avatar: member.permissions['edit_thread_color'],
    };
  }

  return updatedPermissions
    ? {
        ...member,
        permissions: updatedPermissions,
      }
    : member;
}

function addEditThreadAvatarPermissionsToRole(
  role: RoleInfo,
  threadInfo: RawThreadInfo,
): RoleInfo {
  if (role.name === 'Admins') {
    return {
      ...role,
      permissions: {
        ...role.permissions,
        edit_thread_avatar: true,
        descendant_edit_thread_avatar: true,
      },
    };
  }

  if (
    threadTypesWhereMembersRoleHasEditAvatarPermissions.has(threadInfo.type)
  ) {
    return {
      ...role,
      permissions: { ...role.permissions, edit_thread_avatar: true },
    };
  }

  return role;
}

function persistMigrationForThreadAvatarPermission(
  threadInfos: ThreadStoreThreadInfos,
): ThreadStoreThreadInfos {
  const newThreadInfos = {};
  for (const threadID in threadInfos) {
    const threadInfo: RawThreadInfo = threadInfos[threadID];
    const updatedMembers = threadInfo.members.map(member =>
      addEditThreadAvatarPermissionsToUser(threadInfo, member, threadID),
    );

    const updatedCurrentUser = addEditThreadAvatarPermissionsToUser(
      threadInfo,
      threadInfo.currentUser,
      threadID,
    );

    const updatedRoles = {};
    for (const roleID in threadInfo.roles) {
      updatedRoles[roleID] = addEditThreadAvatarPermissionsToRole(
        threadInfo.roles[roleID],
        threadInfo,
      );
    }

    const updatedThreadInfo = {
      ...threadInfo,
      members: updatedMembers,
      currentUser: updatedCurrentUser,
      roles: updatedRoles,
    };
    newThreadInfos[threadID] = updatedThreadInfo;
  }
  return newThreadInfos;
}

export { persistMigrationForThreadAvatarPermission };
