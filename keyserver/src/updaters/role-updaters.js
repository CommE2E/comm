// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';

import { getThreadPermissionBlobFromUserSurfacedPermissions } from 'lib/permissions/keyserver-permissions.js';
import { specialRoles } from 'lib/permissions/special-roles.js';
import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import { threadTypeIsCommunityRoot } from 'lib/shared/threads/thread-specs.js';
import {
  type ThinThreadType,
  threadTypes,
} from 'lib/types/thread-types-enum.js';
import type { ServerLegacyRoleInfo } from 'lib/types/thread-types.js';
import { userSurfacedPermissionsFromRolePermissions } from 'lib/utils/role-utils.js';

import createIDs from '../creators/id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchRoles } from '../fetchers/role-fetchers.js';
import type { Viewer } from '../session/viewer.js';

async function updateRoles(
  viewer: Viewer,
  threadID: string,
  threadType: ThinThreadType,
): Promise<void> {
  const currentRoles: $ReadOnlyArray<ServerLegacyRoleInfo> =
    await fetchRoles(threadID);

  const defaultRolePermissions = getRolePermissionBlobs(threadType);
  const newAdminRolePermissions = defaultRolePermissions.Admins;

  const rolesNeedingUpdate = [];
  let adminRoleIDNeedingDeletion;
  for (const currentRole of currentRoles) {
    if (currentRole.specialRole === specialRoles.ADMIN_ROLE) {
      const newRolePermissions = defaultRolePermissions.Admins;
      if (!newRolePermissions) {
        adminRoleIDNeedingDeletion = currentRole.id;
      } else if (!_isEqual(newRolePermissions)(currentRole.permissions)) {
        rolesNeedingUpdate.push({
          ...currentRole,
          permissions: newRolePermissions,
        });
      }
      continue;
    }

    if (
      !threadTypeIsCommunityRoot(threadType) ||
      threadType === threadTypes.GENESIS
    ) {
      const newRolePermissions = defaultRolePermissions.Members;
      if (!_isEqual(newRolePermissions)(currentRole.permissions)) {
        rolesNeedingUpdate.push({
          ...currentRole,
          permissions: newRolePermissions,
        });
      }
      continue;
    }

    const currentlySelectedUserSurfacedPermissions =
      userSurfacedPermissionsFromRolePermissions(currentRole.permissions);
    const newRolePermissions =
      getThreadPermissionBlobFromUserSurfacedPermissions(
        [...currentlySelectedUserSurfacedPermissions],
        threadType,
      );
    if (!_isEqual(newRolePermissions)(currentRole.permissions)) {
      rolesNeedingUpdate.push({
        ...currentRole,
        permissions: newRolePermissions,
      });
    }
  }

  let adminRoleNeedsCreation = false;
  if (newAdminRolePermissions) {
    const adminRoleAlreadyExists = currentRoles.some(
      currentRole => currentRole.specialRole === specialRoles.ADMIN_ROLE,
    );
    if (!adminRoleAlreadyExists) {
      adminRoleNeedsCreation = true;
    }
  }

  if (
    rolesNeedingUpdate.length === 0 &&
    !adminRoleIDNeedingDeletion &&
    !adminRoleNeedsCreation
  ) {
    return;
  }

  const adminRoleCreationPromise = (async () => {
    if (!adminRoleNeedsCreation) {
      return;
    }

    const [id] = await createIDs('roles', 1);

    const newRow = [
      id,
      threadID,
      'Admins',
      JSON.stringify(newAdminRolePermissions),
      Date.now(),
    ];

    const insertQuery = SQL`
      INSERT INTO roles (id, thread, name, permissions, creation_time)
      VALUES ${[newRow]}
    `;
    const setAdminQuery = SQL`
      UPDATE memberships
      SET role = ${id}
      WHERE thread = ${threadID}
        AND user = ${viewer.userID}
        AND role > 0
    `;
    await Promise.all([dbQuery(insertQuery), dbQuery(setAdminQuery)]);
  })();

  const adminRoleDeletionPromise = (async () => {
    if (!adminRoleIDNeedingDeletion) {
      return;
    }
    const memberRole = currentRoles.find(
      currentRole => currentRole.specialRole === specialRoles.DEFAULT_ROLE,
    );
    invariant(memberRole, 'DEFAULT_ROLE should exist for every thread');
    const updateMembershipsQuery = SQL`
      UPDATE memberships
      SET role = ${memberRole.id}
      WHERE thread = ${threadID}
        AND role = ${adminRoleIDNeedingDeletion}
    `;
    await dbQuery(updateMembershipsQuery);
    const deleteQuery = SQL`
      DELETE r, i
      FROM roles r
      LEFT JOIN ids i ON i.id = r.id
      WHERE r.id = ${adminRoleIDNeedingDeletion}
    `;
    await dbQuery(deleteQuery);
  })();

  const roleUpdatePromise = (async () => {
    if (rolesNeedingUpdate.length === 0) {
      return;
    }
    const updateQuery = SQL`
      UPDATE roles
      SET permissions = CASE id
    `;
    for (const role of rolesNeedingUpdate) {
      const permissionsBlob = JSON.stringify(role.permissions);
      updateQuery.append(SQL`
        WHEN ${role.id} THEN ${permissionsBlob}
      `);
    }
    updateQuery.append(SQL`
        ELSE permissions
      END
      WHERE thread = ${threadID}
    `);
    await dbQuery(updateQuery);
  })();

  await Promise.all([
    adminRoleCreationPromise,
    adminRoleDeletionPromise,
    roleUpdatePromise,
  ]);
}

export { updateRoles };
