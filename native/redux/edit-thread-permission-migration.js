// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';
import type {
  LegacyMemberInfo,
  LegacyRawThreadInfo,
  ClientLegacyRoleInfo,
  LegacyRawThreadInfos,
  LegacyThreadCurrentUserInfo,
  ThickMemberInfo,
} from 'lib/types/thread-types.js';

function addDetailedThreadEditPermissionsToUser<
  T: LegacyMemberInfo | LegacyThreadCurrentUserInfo | ThickMemberInfo,
>(threadInfo: LegacyRawThreadInfo, member: T, threadID: string): T {
  let newPermissions = null;
  if (threadInfo.type === threadTypes.GENESIS_PRIVATE) {
    newPermissions = {
      ...member.permissions,
      edit_thread_color: { value: true, source: threadID },
      edit_thread_description: { value: true, source: threadID },
    };
  } else if (member.permissions['edit_thread']) {
    newPermissions = {
      ...member.permissions,
      edit_thread_color: member.permissions['edit_thread'],
      edit_thread_description: member.permissions['edit_thread'],
    };
  }

  return newPermissions
    ? {
        ...member,
        permissions: newPermissions,
      }
    : member;
}

function addDetailedThreadEditPermissionsToRole(
  role: ClientLegacyRoleInfo,
  threadType: number,
): ClientLegacyRoleInfo {
  let updatedPermissions = null;
  if (role.permissions['edit_thread']) {
    updatedPermissions = {
      ...role.permissions,
      edit_thread_color: role.permissions['edit_thread'],
      edit_thread_description: role.permissions['edit_thread'],
    };
  } else if (threadType === threadTypes.GENESIS_PRIVATE) {
    updatedPermissions = {
      ...role.permissions,
      edit_thread_color: true,
      edit_thread_description: true,
    };
  }
  return updatedPermissions
    ? { ...role, permissions: updatedPermissions }
    : role;
}

function migrateThreadStoreForEditThreadPermissions(threadInfos: {
  +[id: string]: LegacyRawThreadInfo,
}): LegacyRawThreadInfos {
  const newThreadInfos: { [string]: LegacyRawThreadInfo } = {};
  for (const threadID in threadInfos) {
    const threadInfo: LegacyRawThreadInfo = threadInfos[threadID];
    const updatedCurrentUser = addDetailedThreadEditPermissionsToUser(
      threadInfo,
      threadInfo.currentUser,
      threadID,
    );

    const updatedRoles: { [string]: ClientLegacyRoleInfo } = {};
    for (const roleID in threadInfo.roles) {
      updatedRoles[roleID] = addDetailedThreadEditPermissionsToRole(
        threadInfo.roles[roleID],
        threadInfo.type,
      );
    }

    if (threadInfo.thick) {
      const updatedMembers = threadInfo.members.map(member =>
        addDetailedThreadEditPermissionsToUser(threadInfo, member, threadID),
      );
      const newThreadInfo = {
        ...threadInfo,
        members: updatedMembers,
        currentUser: updatedCurrentUser,
        roles: updatedRoles,
      };
      newThreadInfos[threadID] = newThreadInfo;
    } else if (threadInfo.farcaster) {
      const updatedMembers = threadInfo.members.map(member =>
        addDetailedThreadEditPermissionsToUser(threadInfo, member, threadID),
      );
      const newThreadInfo = {
        ...threadInfo,
        members: updatedMembers,
        currentUser: updatedCurrentUser,
        roles: updatedRoles,
      };
      newThreadInfos[threadID] = newThreadInfo;
    } else {
      const updatedMembers = threadInfo.members.map(member =>
        addDetailedThreadEditPermissionsToUser(threadInfo, member, threadID),
      );
      const newThreadInfo = {
        ...threadInfo,
        members: updatedMembers,
        currentUser: updatedCurrentUser,
        roles: updatedRoles,
      };
      newThreadInfos[threadID] = newThreadInfo;
    }
  }
  return newThreadInfos;
}

export { migrateThreadStoreForEditThreadPermissions };
