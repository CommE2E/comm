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
  RoleModificationResult,
} from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import createIDs from './id-creator.js';
import { createUpdates } from './update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
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
): Promise<RoleModificationResult> {
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
  const { community, name, permissions, action } = request;

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

  let query = SQL``;
  if (action === 'create_role') {
    query = SQL`
      INSERT INTO roles (id, thread, name, permissions, creation_time)
      VALUES (${row})
    `;
  }

  const { threadInfos } = await fetchThreadInfos(
    viewer,
    SQL`t.id = ${community}`,
  );
  const threadInfo = threadInfos[community];

  const updateDatas = [];
  for (const memberInfo of threadInfo.members) {
    updateDatas.push({
      type: updateTypes.UPDATE_THREAD,
      userID: memberInfo.id,
      time,
      threadID: community,
    });
  }

  const [{ viewerUpdates }] = await Promise.all([
    createUpdates(updateDatas, { viewer, updatesForCurrentSession: 'return' }),
    dbQuery(query),
  ]);

  return {
    threadInfo,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
  };
}

export { createInitialRolesForNewThread, modifyRole };
