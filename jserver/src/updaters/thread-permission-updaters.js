// @flow

import {
  type ThreadPermissionsBlob,
  type ThreadRolePermissionsBlob,
  type VisibilityRules,
  type ThreadPermissionInfo,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import type { ThreadSubscription } from 'lib/types/subscription-types';

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import {
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
} from 'lib/permissions/thread-permissions';

import { pool, SQL, mergeOrConditions } from '../database';

type RowToSave = {|
  userID: string,
  threadID: string,
  permissions: ThreadPermissionsBlob,
  permissionsForChildren: ?ThreadPermissionsBlob,
  // null role represents by "0"
  role: string,
  subscription?: ThreadSubscription,
  unread?: bool,
|};
type RowToDelete = {|
  userID: string,
  threadID: string,
|};
type MembershipChangeset = {|
  toSave: $ReadOnlyArray<RowToSave>,
  toDelete: $ReadOnlyArray<RowToDelete>,
|};

// 0 role means to remove the user from the thread
// null role means to set the user to the default role
// string role means to set the user to the role with that ID
async function changeRole(
  threadID: string,
  userIDs: $ReadOnlyArray<string>,
  role: string | 0 | null,
): Promise<?MembershipChangeset> {
  const membershipQuery = SQL`
    SELECT m.user, m.role, m.permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN memberships pm
      ON pm.thread = t.parent_thread_id AND pm.user = m.user
    WHERE m.thread = ${threadID} AND m.user IN (${userIDs})
  `;
  const [ [ membershipResult ], roleThreadResult ] = await Promise.all([
    pool.query(membershipQuery),
    changeRoleThreadQuery(threadID, role),
  ]);
  if (!roleThreadResult) {
    return null;
  }

  const roleInfo = new Map();
  for (let row of membershipResult) {
    const userID = row.user.toString();
    const oldPermissionsForChildren = row.permissions_for_children;
    const permissionsFromParent = row.permissions_from_parent;
    roleInfo.set(
      userID,
      {
        oldRole: row.role.toString(),
        oldPermissionsForChildren,
        permissionsFromParent,
      },
    );
  }

  const toSave = [];
  const toDelete = [];
  const toUpdateDescendants = new Map();
  for (let userID of userIDs) {
    let oldPermissionsForChildren = null;
    let permissionsFromParent = null;
    const userRoleInfo = roleInfo.get(userID);
    if (userRoleInfo) {
      const oldRole = userRoleInfo.oldRole;
      if (oldRole === roleThreadResult.roleColumnValue) {
        // If the old role is the same as the new one, we have nothing to update
        continue;
      } else if (oldRole !== "0" && role === null) {
        // In the case where we're just trying to add somebody to a thread, if
        // they already have a role with a nonzero role then we don't need to do
        // anything
        continue;
      }
      oldPermissionsForChildren = userRoleInfo.oldPermissionsForChildren;
      permissionsFromParent = userRoleInfo.permissionsFromParent;
    }

    const permissions = makePermissionsBlob(
      roleThreadResult.rolePermissions,
      permissionsFromParent,
      threadID,
      roleThreadResult.visibilityRules,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(
      permissions,
    );

    if (permissions) {
      toSave.push({
        userID,
        threadID,
        permissions,
        permissionsForChildren,
        role: roleThreadResult.roleColumnValue,
      });
    } else {
      toDelete.push({ userID, threadID });
    }

    if (!_isEqual(permissionsForChildren)(oldPermissionsForChildren)) {
      toUpdateDescendants.set(userID, permissionsForChildren);
    }
  }

  if (toUpdateDescendants.size > 0) {
    const descendantResults = await updateDescendantPermissions(
      threadID,
      toUpdateDescendants,
    );
    return {
      toSave: [...toSave, ...descendantResults.toSave],
      toDelete: [...toDelete, ...descendantResults.toDelete],
    };
  }

  return { toSave, toDelete };
}

type RoleThreadResult = {|
  roleColumnValue: string,
  visibilityRules: VisibilityRules,
  rolePermissions: ?ThreadRolePermissionsBlob,
|};
async function changeRoleThreadQuery(
  threadID: string,
  role: string | 0 | null,
): Promise<?RoleThreadResult> {
  if (role === 0) {
    const query = SQL`
      SELECT visibility_rules FROM threads WHERE id = ${threadID}
    `;
    const [ result ] = await pool.query(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: "0",
      visibilityRules: assertVisibilityRules(row.visibility_rules),
      rolePermissions: null,
    };
  } else if (role !== null) {
    const query = SQL`
      SELECT t.visibility_rules, r.permissions
      FROM threads t
      LEFT JOIN roles r ON r.id = ${role}
      WHERE t.id = ${threadID}
    `;
    const [ result ] = await pool.query(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: role,
      visibilityRules: assertVisibilityRules(row.visibility_rules),
      rolePermissions: row.permissions,
    };
  } else {
    const query = SQL`
      SELECT t.visibility_rules, t.default_role, r.permissions
      FROM threads t
      LEFT JOIN roles r ON r.id = t.default_role
      WHERE t.id = ${threadID}
    `;
    const [ result ] = await pool.query(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: row.default_role.toString(),
      visibilityRules: assertVisibilityRules(row.visibility_rules),
      rolePermissions: row.permissions,
    };
  }
}

async function updateDescendantPermissions(
  initialParentThreadID: string,
  initialUsersToPermissionsFromParent: Map<string, ?ThreadPermissionsBlob>,
): Promise<MembershipChangeset> {
  const stack = [[
    initialParentThreadID,
    initialUsersToPermissionsFromParent,
  ]];
  const toSave = [];
  const toDelete = [];
  while (stack.length > 0) {
    const [ parentThreadID, usersToPermissionsFromParent ] = stack.shift();

    const userIDs = [...usersToPermissionsFromParent.keys()];
    const query = SQL`
      SELECT t.id, m.user, t.visibility_rules,
        r.permissions AS role_permissions, m.permissions,
        m.permissions_for_children, m.role
      FROM threads t
      LEFT JOIN memberships m ON m.thread = t.id AND m.user IN (${userIDs})
      LEFT JOIN roles r ON r.id = m.role
      WHERE t.parent_thread_id = ${parentThreadID}
    `;
    const [ result ] = await pool.query(query);

    const childThreadInfos = new Map();
    for (let row of result) {
      const threadID = row.id.toString();
      if (!childThreadInfos.has(threadID)) {
        childThreadInfos.set(threadID, {
          visibilityRules: assertVisibilityRules(row.visibility_rules),
          userInfos: new Map(),
        });
      }
      if (!row.user) {
        continue;
      }
      const childThreadInfo = childThreadInfos.get(threadID);
      invariant(childThreadInfo, `value should exist for key ${threadID}`);
      const userID = row.user.toString();
      childThreadInfo.userInfos.set(
        userID,
        {
          role: row.role.toString(),
          rolePermissions: row.role_permissions,
          permissions: row.permissions,
          permissionsForChildren: row.permissions_for_children,
        },
      );
    }

    for (let [ threadID, childThreadInfo ] of childThreadInfos) {
      const userInfos = childThreadInfo.userInfos;
      const usersForNextLayer = new Map();
      for (
        const [ userID, permissionsFromParent ]
        of usersToPermissionsFromParent
      ) {
        const userInfo = userInfos.get(userID);
        const role = userInfo ? userInfo.role : "0";
        const rolePermissions = userInfo ? userInfo.rolePermissions : null;
        const oldPermissions = userInfo ? userInfo.permissions : null;
        const oldPermissionsForChildren = userInfo
          ? userInfo.permissionsForChildren
          : null;
        const permissions = makePermissionsBlob(
          rolePermissions,
          permissionsFromParent,
          threadID,
          childThreadInfo.visibilityRules,
        );
        if (_isEqual(permissions)(oldPermissions)) {
          // This thread and all of its children need no updates, since its
          // permissions are unchanged by this operation
          continue;
        }
        const permissionsForChildren = makePermissionsForChildrenBlob(
          permissions,
        );
        if (permissions) {
          toSave.push({
            userID,
            threadID,
            permissions,
            permissionsForChildren,
            role,
          });
        } else {
          toDelete.push({ userID, threadID });
        }
        if (!_isEqual(permissionsForChildren)(oldPermissionsForChildren)) {
          usersForNextLayer.set(userID, permissionsForChildren);
        }
      }
      if (usersForNextLayer.size > 0) {
        stack.push([threadID, usersForNextLayer]);
      }
    }
  }
  return { toSave, toDelete };
}

const defaultSubscriptionString =
  JSON.stringify({ home: false, pushNotifs: false });

async function saveMemberships(toSave: $ReadOnlyArray<RowToSave>) {
  if (toSave.length === 0) {
    return;
  }

  const time = Date.now();
  const insertRows = toSave.map(
    rowToSave => [
      rowToSave.userID,
      rowToSave.threadID,
      rowToSave.role,
      time,
      rowToSave.subscription
        ? JSON.stringify(rowToSave.subscription)
        : defaultSubscriptionString,
      JSON.stringify(rowToSave.permissions),
      rowToSave.permissionsForChildren
        ? JSON.stringify(rowToSave.permissionsForChildren)
        : null,
      rowToSave.unread ? "1" : "0",
    ],
  );

  // Logic below will only update an existing membership row's `subscription`
  // column if the user is either joining or leaving the thread. That means
  // there's no way to use this function to update a user's subscription without
  // also making them join or leave the thread. The reason we do this is because
  // we need to specify a value for `subscription` here, as it's a non-null
  // column and this is an INSERT, but we don't want to require people to have
  // to know the current `subscription` when they're just using this function to
  // update the permissions of an existing membership row.
  const query = SQL`
    INSERT INTO memberships (user, thread, role, creation_time, subscription,
      permissions, permissions_for_children, unread)
    VALUES ${insertRows}
    ON DUPLICATE KEY UPDATE
      subscription = IF(
        (role = 0 AND VALUES(role) != 0)
          OR (role != 0 AND VALUES(role) = 0),
        VALUES(subscription),
        subscription
      ),
      role = VALUES(role),
      permissions = VALUES(permissions),
      permissions_for_children = VALUES(permissions_for_children)
  `;
  await pool.query(query);
}

async function deleteMemberships(toDelete: $ReadOnlyArray<RowToDelete>) {
  if (toDelete.length === 0) {
    return;
  }
  const deleteRows = toDelete.map(
    rowToDelete =>
      SQL`(user = ${rowToDelete.userID} AND thread = ${rowToDelete.threadID})`,
  );
  const conditions = mergeOrConditions(deleteRows);
  const query = SQL`DELETE FROM memberships WHERE `;
  query.append(conditions);
  await pool.query(query);
}

export {
  changeRole,
  saveMemberships,
  deleteMemberships,
};
