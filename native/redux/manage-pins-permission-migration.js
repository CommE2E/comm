// @flow

import type {
  LegacyRawThreadInfo,
  LegacyMemberInfo,
  LegacyThreadCurrentUserInfo,
  ClientLegacyRoleInfo,
  LegacyRawThreadInfos,
  ThickMemberInfo,
} from 'lib/types/thread-types.js';

type ThreadStoreThreadInfos = LegacyRawThreadInfos;

const adminRoleName = 'Admins';

function addManagePinsThreadPermissionToUser<
  TargetMemberInfo:
    | LegacyMemberInfo
    | LegacyThreadCurrentUserInfo
    | ThickMemberInfo,
>(
  threadInfo: LegacyRawThreadInfo,
  member: TargetMemberInfo,
  threadID: string,
): TargetMemberInfo {
  const isAdmin =
    member.role && threadInfo.roles[member.role].name === adminRoleName;
  let newPermissionsForMember;
  if (isAdmin) {
    newPermissionsForMember = {
      ...member.permissions,
      manage_pins: { value: true, source: threadID },
    };
  }

  return newPermissionsForMember
    ? {
        ...member,
        permissions: newPermissionsForMember,
      }
    : member;
}

function addManagePinsThreadPermissionToRole(
  role: ClientLegacyRoleInfo,
): ClientLegacyRoleInfo {
  const isAdminRole = role.name === adminRoleName;
  let updatedPermissions;

  if (isAdminRole) {
    updatedPermissions = {
      ...role.permissions,
      manage_pins: true,
      descendant_manage_pins: true,
    };
  }

  return updatedPermissions
    ? { ...role, permissions: updatedPermissions }
    : role;
}

function persistMigrationForManagePinsThreadPermission(
  threadInfos: ThreadStoreThreadInfos,
): ThreadStoreThreadInfos {
  const newThreadInfos: { [string]: LegacyRawThreadInfo } = {};
  for (const threadID in threadInfos) {
    const threadInfo: LegacyRawThreadInfo = threadInfos[threadID];
    const updatedCurrentUser = addManagePinsThreadPermissionToUser(
      threadInfo,
      threadInfo.currentUser,
      threadID,
    );

    const updatedRoles: { [string]: ClientLegacyRoleInfo } = {};
    for (const roleID in threadInfo.roles) {
      updatedRoles[roleID] = addManagePinsThreadPermissionToRole(
        threadInfo.roles[roleID],
      );
    }

    if (threadInfo.thick) {
      const updatedMembers = threadInfo.members.map(member =>
        addManagePinsThreadPermissionToUser(threadInfo, member, threadID),
      );
      const updatedThreadInfo = {
        ...threadInfo,
        members: updatedMembers,
        currentUser: updatedCurrentUser,
        roles: updatedRoles,
      };
      newThreadInfos[threadID] = updatedThreadInfo;
    } else if (threadInfo.farcaster) {
      const updatedMembers = threadInfo.members.map(member =>
        addManagePinsThreadPermissionToUser(threadInfo, member, threadID),
      );
      const updatedThreadInfo = {
        ...threadInfo,
        members: updatedMembers,
        currentUser: updatedCurrentUser,
        roles: updatedRoles,
      };
      newThreadInfos[threadID] = updatedThreadInfo;
    } else {
      const updatedMembers = threadInfo.members.map(member =>
        addManagePinsThreadPermissionToUser(threadInfo, member, threadID),
      );
      const updatedThreadInfo = {
        ...threadInfo,
        members: updatedMembers,
        currentUser: updatedCurrentUser,
        roles: updatedRoles,
      };
      newThreadInfos[threadID] = updatedThreadInfo;
    }
  }
  return newThreadInfos;
}

export { persistMigrationForManagePinsThreadPermission };
