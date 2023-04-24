// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';

import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import type { ThreadType } from 'lib/types/thread-types.js';

import createIDs from '../creators/id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchRoles } from '../fetchers/role-fetchers.js';
import type { Viewer } from '../session/viewer.js';

async function updateRoles(
  viewer: Viewer,
  threadID: string,
  threadType: ThreadType,
): Promise<void> {
  const currentRoles = await fetchRoles(threadID);

  const currentRolePermissions = {};
  const currentRoleIDs = {};
  for (const roleInfo of currentRoles) {
    currentRolePermissions[roleInfo.name] = roleInfo.permissions;
    currentRoleIDs[roleInfo.name] = roleInfo.id;
  }

  const rolePermissions = getRolePermissionBlobs(threadType);
  if (_isEqual(rolePermissions)(currentRolePermissions)) {
    return;
  }

  const promises = [];

  if (rolePermissions.Admins && !currentRolePermissions.Admins) {
    const [id] = await createIDs('roles', 1);
    const newRow = [
      id,
      threadID,
      'Admins',
      JSON.stringify(rolePermissions.Admins),
      Date.now(),
    ];
    const insertQuery = SQL`
      INSERT INTO roles (id, thread, name, permissions, creation_time)
      VALUES ${[newRow]}
    `;
    promises.push(dbQuery(insertQuery));
    const setAdminQuery = SQL`
      UPDATE memberships
      SET role = ${id}
      WHERE thread = ${threadID}
        AND user = ${viewer.userID}
        AND role > 0
    `;
    promises.push(dbQuery(setAdminQuery));
  } else if (!rolePermissions.Admins && currentRolePermissions.Admins) {
    invariant(
      currentRoleIDs.Admins && currentRoleIDs.Members,
      'ids should exist for both Admins and Members roles',
    );
    const id = currentRoleIDs.Admins;
    const deleteQuery = SQL`
      DELETE r, i
      FROM roles r
      LEFT JOIN ids i ON i.id = r.id
      WHERE r.id = ${id}
    `;
    promises.push(dbQuery(deleteQuery));
    const updateMembershipsQuery = SQL`
      UPDATE memberships
      SET role = ${currentRoleIDs.Members}
      WHERE thread = ${threadID}
        AND role > 0
    `;
    promises.push(dbQuery(updateMembershipsQuery));
  }

  const updatePermissions = {};
  for (const name in currentRoleIDs) {
    const currentPermissions = currentRolePermissions[name];
    const permissions = rolePermissions[name];
    if (
      !permissions ||
      !currentPermissions ||
      _isEqual(permissions)(currentPermissions)
    ) {
      continue;
    }
    const id = currentRoleIDs[name];
    updatePermissions[id] = permissions;
  }
  if (Object.values(updatePermissions).length > 0) {
    const updateQuery = SQL`
      UPDATE roles
      SET permissions = CASE id
    `;
    for (const id in updatePermissions) {
      const permissionsBlob = JSON.stringify(updatePermissions[id]);
      updateQuery.append(SQL`
        WHEN ${id} THEN ${permissionsBlob}
      `);
    }
    updateQuery.append(SQL`
        ELSE permissions
      END
      WHERE thread = ${threadID}
    `);
    promises.push(dbQuery(updateQuery));
  }

  await Promise.all(promises);
}

export { updateRoles };
