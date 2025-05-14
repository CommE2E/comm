// @flow

import { getUniversalCommunityRootPermissionsBlob } from 'lib/permissions/keyserver-permissions.js';
import { specialRoles } from 'lib/permissions/special-roles.js';
import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import {
  configurableCommunityPermissions,
  userSurfacedPermissions,
  type UserSurfacedPermission,
} from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { deepDiff, values } from 'lib/utils/objects.js';

import { main } from './utils.js';
import { SQL, dbQuery } from '../database/database.js';

async function validateRolePermissions() {
  // Get all roles for existing communities since custom roles are at a
  // community-level rather than a thread-level.
  const fetchRolesQuery = SQL`
		SELECT r.id, r.name, r.permissions, r.thread, 
      r.special_role = ${specialRoles.DEFAULT_ROLE} AS is_default, t.type
		FROM roles r
		INNER JOIN threads t
			ON t.id = r.thread
		WHERE t.type IN (${[
      threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
      threadTypes.COMMUNITY_ROOT,
    ]})
	`;
  const [results] = await dbQuery(fetchRolesQuery);

  for (const result of results) {
    const roleID = result.id.toString();
    const roleName = result.name;
    const existingRolePermissions = JSON.parse(result.permissions);
    const roleIsDefaultRole = Boolean(result.is_default);
    const threadID = result.thread.toString();
    const threadType = result.type;

    const universalCommunityPermissions =
      getUniversalCommunityRootPermissionsBlob(threadType);

    // Get the 'expected permissions' set for the role. If the role is
    // default (Members) or Admins, these permission blobs can be retrieved
    // by calling getRolePermissionBlobs with the threadType. Otherwise, the
    // role is a custom role and the expected permissions are the universal
    // community permissions assuming the role has not been edited.
    // The case of a role being edited is handled below.
    const expectedPermissionBlobs = getRolePermissionBlobs(threadType);
    let baseExpectedPermissionBlob;
    if (roleIsDefaultRole) {
      baseExpectedPermissionBlob = expectedPermissionBlobs.Members;
    } else if (roleName === 'Admins') {
      baseExpectedPermissionBlob = expectedPermissionBlobs.Admins;
    } else if (roleName) {
      baseExpectedPermissionBlob = universalCommunityPermissions;
    } else {
      baseExpectedPermissionBlob = {};
    }
    console.log('====================================');

    // Ideally, this should never happen, but we'll skip over this in case.
    if (!baseExpectedPermissionBlob) {
      console.log(
        `Skipping role ${roleName} with ID (${roleID}) in thread ${threadID}`,
      );
      continue;
    }

    // Deep diff seems to compare objects one-way (so deepDiff(a, b) !==
    // deepDiff(b, a)). This means that if a key is not in `a` but not in `b`,
    // the diff will not include that key. As a result, we need to compare both
    // ways to ensure that we're not missing any permission discrepancies.
    const expectedPermissionsToExistingPermissions = deepDiff(
      baseExpectedPermissionBlob,
      existingRolePermissions,
    );
    const existingPermissionsToExpectedPermissions = deepDiff(
      existingRolePermissions,
      baseExpectedPermissionBlob,
    );

    console.log(
      `Validating: Role Name (${roleName}) | Role ID (${roleID}) | ` +
        `Thread Type (${threadType}) | Thread ID (${threadID})\n`,
    );
    console.log(
      `deepDiff(baseExpectedPermissionBlob, existingRolePermissions) = ${JSON.stringify(
        expectedPermissionsToExistingPermissions,
        null,
        2,
      )}\n`,
    );
    console.log(
      `deepDiff(existingRolePermissions, baseExpectedPermissionBlob) = ${JSON.stringify(
        existingPermissionsToExpectedPermissions,
        null,
        2,
      )}\n`,
    );

    // Now, we want to see if the permission discrepancies are due to the user
    // editing the role. To do this, we need to identify any permission
    // discrepancies that could be linked to a specific user-surfaced
    // permission. This could be useful in manually parsing through the
    // script results to 'write off' discrepancies as user role edits.
    const userSurfacedExpectedPermissionsToExistingPermissions =
      new Set<UserSurfacedPermission>();
    const userSurfacedExistingPermissionsToExpectedPermissions =
      new Set<UserSurfacedPermission>();

    for (const permission of values(userSurfacedPermissions)) {
      const permissionSet = Array.from(
        configurableCommunityPermissions[permission],
      );
      for (const p of permissionSet) {
        if (expectedPermissionsToExistingPermissions[p] === true) {
          userSurfacedExpectedPermissionsToExistingPermissions.add(permission);
        }
        if (existingPermissionsToExpectedPermissions[p] === true) {
          userSurfacedExistingPermissionsToExpectedPermissions.add(permission);
        }
      }
    }

    const expectedPermissionsToExistingPermissionsValues = values(
      expectedPermissionsToExistingPermissions,
    );
    const existingPermissionsToExpectedPermissionsValues = values(
      existingPermissionsToExpectedPermissions,
    );

    if (
      expectedPermissionsToExistingPermissionsValues.length > 0 ||
      existingPermissionsToExpectedPermissionsValues.length > 0
    ) {
      console.log(
        `Potential permission discrepancies for role ${roleName} that ` +
          `could be linked back to user surfaced permissions (i.e. not an ` +
          `actual discrepancy, but rather a user edited a role): \n`,
      );

      if (expectedPermissionsToExistingPermissionsValues.length > 0) {
        console.log(
          `userSurfacedExpectedPermissionsToExistingPermissions = ${JSON.stringify(
            [...userSurfacedExpectedPermissionsToExistingPermissions],
            null,
            2,
          )}\n`,
        );
      }
      if (existingPermissionsToExpectedPermissionsValues.length > 0) {
        console.log(
          `userSurfacedExistingPermissionsToExpectedPermissions = ${JSON.stringify(
            [...userSurfacedExistingPermissionsToExpectedPermissions],
            null,
            2,
          )}`,
        );
      }
    }
  }

  console.log('====================================');
}

main([validateRolePermissions]);
