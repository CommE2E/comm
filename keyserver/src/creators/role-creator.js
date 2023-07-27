// @flow

import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import {
  universalCommunityPermissions,
  userSurfacedPermissionsSet,
  configurableCommunityPermissions,
  threadPermissions,
} from 'lib/types/thread-permission-types.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type {
  RoleInfo,
  RoleModificationRequest,
  RoleModificationResult,
} from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';

import createIDs from './id-creator.js';
import { createUpdates } from './update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchThreadInfos,
  fetchServerThreadInfos,
  rawThreadInfosFromServerThreadInfos,
} from '../fetchers/thread-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { updateRole } from '../updaters/thread-updaters.js';

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

  const { community, name, permissions } = request;

  for (const permission of permissions) {
    if (!userSurfacedPermissionsSet.has(permission)) {
      throw new ServerError('invalid_parameters');
    }
  }

  const [id] = await createIDs('roles', 1);
  const time = Date.now();

  const configuredPermissions = permissions
    .map(permission => [...configurableCommunityPermissions[permission]])
    .flat();

  const rolePermissions = [
    ...universalCommunityPermissions,
    ...configuredPermissions,
  ];

  // For communities of the type `COMMUNITY_ANNOUNCEMENT_ROOT`, the ability for
  // the role to be voiced needs to be configured (i.e. the parameters should
  // include the user-facing permission VOICED_IN_ANNOUNCEMENT_CHANNELS). This
  // means we do not give 'voiced' permissions by default to all new roles. As
  // a result, if the thread type is `COMMUNITY_ROOT`, we want to ensure that
  // the role has the voiced permission.
  const { threadInfos } = await fetchThreadInfos(viewer, {
    threadID: community,
  });
  const threadInfo = threadInfos[community];

  if (threadInfo.type === threadTypes.COMMUNITY_ROOT) {
    rolePermissions.push(threadPermissions.VOICED);
  }

  const permissionsBlob = JSON.stringify(
    Object.fromEntries(rolePermissions.map(permission => [permission, true])),
  );

  const row = [id, community, name, permissionsBlob, time];

  let query = SQL``;
  if (request.action === 'create_role') {
    query = SQL`
      INSERT INTO roles (id, thread, name, permissions, creation_time)
      VALUES (${row})
    `;

    await dbQuery(query);
  } else if (request.action === 'edit_role') {
    const { existingRoleID } = request;

    query = SQL`
      UPDATE roles
      SET name = ${name}, permissions = ${permissionsBlob}
      WHERE id = ${existingRoleID}
    `;

    await dbQuery(query);

    // The `updateRole` needs to occur after the role has been updated
    // in the database because it will want the most up to date role info
    // (permissions / name)
    const membersWithRole = threadInfo.members
      .filter(memberInfo => memberInfo.role === existingRoleID)
      .map(memberInfo => memberInfo.id);

    if (membersWithRole.length > 0) {
      await updateRole(
        viewer,
        {
          threadID: community,
          role: existingRoleID,
          memberIDs: membersWithRole,
        },
        { silenceNewMessages: true, forcePermissionRecalculation: true },
      );
    }
  }

  const fetchServerThreadInfosResult = await fetchServerThreadInfos({
    threadID: community,
  });
  const { threadInfos: serverThreadInfos } = fetchServerThreadInfosResult;
  const serverThreadInfo = serverThreadInfos[community];

  if (!serverThreadInfo) {
    throw new ServerError('internal_error');
  }

  const updateDatas = [];
  for (const memberInfo of serverThreadInfo.members) {
    updateDatas.push({
      type: updateTypes.UPDATE_THREAD,
      userID: memberInfo.id,
      time,
      threadID: community,
    });
  }

  const { viewerUpdates } = await createUpdates(updateDatas, {
    viewer,
    updatesForCurrentSession: 'return',
  });

  const { threadInfos: rawThreadInfos } = rawThreadInfosFromServerThreadInfos(
    viewer,
    fetchServerThreadInfosResult,
  );
  const rawThreadInfo = rawThreadInfos[community];

  return {
    threadInfo: rawThreadInfo,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
  };
}

export { createInitialRolesForNewThread, modifyRole };
