// @flow

import type {
  RawThreadInfo,
  MemberInfo,
  ThreadCurrentUserInfo,
  RoleInfo,
  RawThreadInfos,
} from 'lib/types/thread-types.js';

type ThreadStoreThreadInfos = RawThreadInfos;

const adminRoleName = 'Admins';

function addManagePinsThreadPermissionToUser<
  TargetMemberInfo: MemberInfo | ThreadCurrentUserInfo,
>(
  threadInfo: RawThreadInfo,
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

function addManagePinsThreadPermissionToRole(role: RoleInfo): RoleInfo {
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
  const newThreadInfos: { [string]: RawThreadInfo } = {};
  for (const threadID in threadInfos) {
    const threadInfo: RawThreadInfo = threadInfos[threadID];
    const updatedMembers = threadInfo.members.map(member =>
      addManagePinsThreadPermissionToUser(threadInfo, member, threadID),
    );

    const updatedCurrentUser = addManagePinsThreadPermissionToUser(
      threadInfo,
      threadInfo.currentUser,
      threadID,
    );

    const updatedRoles: { [string]: RoleInfo } = {};
    for (const roleID in threadInfo.roles) {
      updatedRoles[roleID] = addManagePinsThreadPermissionToRole(
        threadInfo.roles[roleID],
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

export { persistMigrationForManagePinsThreadPermission };
