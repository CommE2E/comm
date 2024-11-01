// @flow

import { specialRoles } from 'lib/permissions/special-roles.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type {
  RoleDeletionRequest,
  RoleDeletionResult,
} from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchServerThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  fetchAccessibleThreadInfos,
} from '../fetchers/thread-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { updateRole } from '../updaters/thread-updaters.js';

async function deleteOrphanedRoles(): Promise<void> {
  await dbQuery(SQL`
    DELETE r, i
    FROM roles r
    LEFT JOIN ids i ON i.id = r.id
    LEFT JOIN threads t ON t.id = r.thread
    WHERE t.id IS NULL
  `);
}

async function deleteRole(
  viewer: Viewer,
  request: RoleDeletionRequest,
): Promise<RoleDeletionResult> {
  const hasPermission = await checkThreadPermission(
    viewer,
    request.community,
    threadPermissions.CHANGE_ROLE,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const { community, roleID } = request;

  const defaultRoleQuery = SQL`
    SELECT id AS default_role
    FROM roles
    WHERE thread = ${community}
      AND special_role = ${specialRoles.DEFAULT_ROLE}
  `;

  const membersWithRoleQuery = SQL`
    SELECT user
    FROM memberships
    WHERE thread = ${community}
      AND role = ${roleID}
  `;

  const [[defaultRoleResult], [membersWithRoleResult], { threadInfos }] =
    await Promise.all([
      dbQuery(defaultRoleQuery),
      dbQuery(membersWithRoleQuery),
      fetchAccessibleThreadInfos(viewer, {
        threadID: community,
      }),
    ]);
  const threadInfo = threadInfos[community];

  if (!threadInfo) {
    throw new ServerError('invalid_parameters');
  }

  const defaultRoleID = defaultRoleResult[0].default_role.toString();
  const membersWithRole = membersWithRoleResult.map(result => result.user);
  const adminRoleID = Object.keys(threadInfo.roles).find(
    role => threadInfo.roles[role].name === 'Admins',
  );

  if (roleID === defaultRoleID || roleID === adminRoleID) {
    throw new ServerError('invalid_parameters');
  }

  if (membersWithRole.length > 0) {
    await updateRole(viewer, {
      threadID: community,
      memberIDs: membersWithRole,
      role: defaultRoleID,
    });
  }

  const deleteFromRolesQuery = SQL`
    DELETE FROM roles
    WHERE id = ${roleID}
      AND thread = ${community}
  `;

  await dbQuery(deleteFromRolesQuery);

  const fetchServerThreadInfosResult = await fetchServerThreadInfos({
    threadID: community,
  });
  const { threadInfos: serverThreadInfos } = fetchServerThreadInfosResult;
  const serverThreadInfo = serverThreadInfos[community];

  const time = Date.now();

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

export { deleteOrphanedRoles, deleteRole };
