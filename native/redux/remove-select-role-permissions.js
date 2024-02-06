// @flow

import type {
  LegacyRawThreadInfos,
  LegacyRawThreadInfo,
  ClientLegacyRoleInfo,
} from 'lib/types/thread-types.js';
import { permissionsToRemoveInMigration } from 'lib/utils/migration-utils.js';

function persistMigrationToRemoveSelectRolePermissions(
  rawThreadInfos: LegacyRawThreadInfos,
): LegacyRawThreadInfos {
  // This is to handle the client being logged out and not having any threads
  // to provide here. In this case, we want the migration to still succeed
  // so we early return an empty object.
  if (!rawThreadInfos) {
    return {};
  }

  const updatedThreadInfos: { [string]: LegacyRawThreadInfo } = {};
  for (const threadID in rawThreadInfos) {
    const threadInfo = rawThreadInfos[threadID];
    const { roles } = threadInfo;

    const updatedRoles: { [string]: ClientLegacyRoleInfo } = {};
    for (const roleID in roles) {
      const role = roles[roleID];
      const { permissions: rolePermissions } = role;
      const updatedPermissions: { [string]: boolean } = {};
      for (const permission in rolePermissions) {
        if (!permissionsToRemoveInMigration.includes(permission)) {
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

export { persistMigrationToRemoveSelectRolePermissions };
