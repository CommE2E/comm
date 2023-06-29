// @flow

import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import {
  guaranteedCommunityPermissions,
  threadPermissions,
} from 'lib/types/thread-permission-types.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';
import type {
  RoleInfo,
  RoleModificationRequest,
} from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import createIDs from './id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import type { Viewer } from '../session/viewer.js';

type InitialRoles = {
  +default: RoleInfo,
  +creator: RoleInfo,
};
async function createInitialRolesForNewThread(
  threadID: string,
  threadType: ThreadType,
): Promise<InitialRoles> {
  const rolePermissions = getRolePermissionBlobs(threadType);
  const ids = await createIDs('roles', Object.values(rolePermissions).length);

  const time = Date.now();
  const newRows = [];
  const namesToIDs = {};
  for (const name in rolePermissions) {
    const id = ids.shift();
    namesToIDs[name] = id;
    const permissionsBlob = JSON.stringify(rolePermissions[name]);
    newRows.push([id, threadID, name, permissionsBlob, time]);
  }

  const query = SQL`
    INSERT INTO roles (id, thread, name, permissions, creation_time)
    VALUES ${newRows}
  `;
  await dbQuery(query);

  const defaultRoleInfo = {
    id: namesToIDs.Members,
    name: 'Members',
    permissions: rolePermissions.Members,
    isDefault: true,
  };
  if (!rolePermissions.Admins) {
    return {
      default: defaultRoleInfo,
      creator: defaultRoleInfo,
    };
  }

  const adminRoleInfo = {
    id: namesToIDs.Admins,
    name: 'Admins',
    permissions: rolePermissions.Admins,
    isDefault: false,
  };
  return {
    default: defaultRoleInfo,
    creator: adminRoleInfo,
  };
}

async function modifyRole(
  viewer: Viewer,
  request: RoleModificationRequest,
): Promise<void> {
  const hasPermission = await checkThreadPermission(
    viewer,
    request.community,
    threadPermissions.CHANGE_ROLE,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const [id] = await createIDs('roles', 1);
  const time = Date.now();
  const { community, name, permissions } = request;

  const threadPermissionValues = values(threadPermissions);
  for (const permission of permissions) {
    if (!threadPermissionValues.some(value => permission.includes(value))) {
      throw new ServerError('invalid_permissions');
    }
  }

  const rolePermissions = [...guaranteedCommunityPermissions, ...permissions];
  const permissionsBlob = JSON.stringify(
    Object.fromEntries(rolePermissions.map(permission => [permission, true])),
  );

  const row = [id, community, name, permissionsBlob, time];

  const query = SQL`
    INSERT INTO roles (id, thread, name, permissions, creation_time)
    VALUES (${row})
  `;

  await dbQuery(query);
}

export { createInitialRolesForNewThread, modifyRole };
