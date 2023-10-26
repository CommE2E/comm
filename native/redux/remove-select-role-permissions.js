// @flow

import type { RawThreadInfos } from 'lib/types/thread-types.js';

function persistMigrationToRemoveDescendantOpenVoiced(
  rawThreadInfos: RawThreadInfos,
): RawThreadInfos {
  // This is to handle the client being logged out and not having any threads
  // to provide here. In this case, we want the migration to still succeed
  // so we early return an empty object.
  if (!rawThreadInfos) {
    return {};
  }

  const updatedThreadInfos = {};
  for (const threadID in rawThreadInfos) {
    const threadInfo = rawThreadInfos[threadID];
    const { roles } = threadInfo;

    const updatedRoles = {};
    for (const roleID in roles) {
      const role = roles[roleID];
      const { permissions: rolePermissions } = role;
      const updatedPermissions = {};
      for (const permission in rolePermissions) {
        if (permission !== 'descendant_open_voiced') {
          updatedPermissions[permission] = rolePermissions[permission];
        }
      }
      updatedRoles[roleID] = { ...role, permissions: updatedPermissions };
    }

    const updatedThreadInfo = {
      ...threadInfo,
      roles: updatedRoles,
    };

    updatedThreadInfos[threadID] = updatedThreadInfo;
  }

  return updatedThreadInfos;
}

export { persistMigrationToRemoveDescendantOpenVoiced };
