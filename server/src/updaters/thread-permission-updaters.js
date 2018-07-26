// @flow

import {
  type ThreadPermissionsBlob,
  type ThreadRolePermissionsBlob,
  type ThreadType,
  type ThreadPermissionInfo,
  assertThreadType,
} from 'lib/types/thread-types';
import type { ThreadSubscription } from 'lib/types/subscription-types';
import type { Viewer } from '../session/viewer';
import { updateTypes, type UpdateInfo } from 'lib/types/update-types';
import type { CalendarQuery } from 'lib/types/entry-types';

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import {
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
} from 'lib/permissions/thread-permissions';
import { rawThreadInfoFromServerThreadInfo } from 'lib/shared/thread-utils';

import {
  fetchServerThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers';
import { createUpdates } from '../creators/update-creator';

import { dbQuery, SQL, mergeOrConditions } from '../database';

type RowToSave = {|
  operation: "update" | "join",
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
  operation: "delete",
  userID: string,
  threadID: string,
|};
type Row = RowToSave | RowToDelete;
type Changeset = Row[];

// 0 role means to remove the user from the thread
// null role means to set the user to the default role
// string role means to set the user to the role with that ID
async function changeRole(
  threadID: string,
  userIDs: $ReadOnlyArray<string>,
  role: string | 0 | null,
): Promise<?Changeset> {
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
    dbQuery(membershipQuery),
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

  const changeset = [];
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
      roleThreadResult.threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(
      permissions,
    );

    if (permissions) {
      changeset.push({
        operation:
          roleThreadResult.roleColumnValue !== "0" &&
          (!userRoleInfo || userRoleInfo.oldRole === "0")
            ? "join"
            : "update",
        userID,
        threadID,
        permissions,
        permissionsForChildren,
        role: roleThreadResult.roleColumnValue,
      });
    } else {
      changeset.push({
        operation: "delete",
        userID,
        threadID,
      });
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
    changeset.push(...descendantResults);
  }

  return changeset;
}

type RoleThreadResult = {|
  roleColumnValue: string,
  threadType: ThreadType,
  rolePermissions: ?ThreadRolePermissionsBlob,
|};
async function changeRoleThreadQuery(
  threadID: string,
  role: string | 0 | null,
): Promise<?RoleThreadResult> {
  if (role === 0) {
    const query = SQL`SELECT type FROM threads WHERE id = ${threadID}`;
    const [ result ] = await dbQuery(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: "0",
      threadType: assertThreadType(row.type),
      rolePermissions: null,
    };
  } else if (role !== null) {
    const query = SQL`
      SELECT t.type, r.permissions
      FROM threads t
      LEFT JOIN roles r ON r.id = ${role}
      WHERE t.id = ${threadID}
    `;
    const [ result ] = await dbQuery(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: role,
      threadType: assertThreadType(row.type),
      rolePermissions: row.permissions,
    };
  } else {
    const query = SQL`
      SELECT t.type, t.default_role, r.permissions
      FROM threads t
      LEFT JOIN roles r ON r.id = t.default_role
      WHERE t.id = ${threadID}
    `;
    const [ result ] = await dbQuery(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: row.default_role.toString(),
      threadType: assertThreadType(row.type),
      rolePermissions: row.permissions,
    };
  }
}

async function updateDescendantPermissions(
  initialParentThreadID: string,
  initialUsersToPermissionsFromParent: Map<string, ?ThreadPermissionsBlob>,
): Promise<Changeset> {
  const stack = [[
    initialParentThreadID,
    initialUsersToPermissionsFromParent,
  ]];
  const changeset = [];
  while (stack.length > 0) {
    const [ parentThreadID, usersToPermissionsFromParent ] = stack.shift();

    const userIDs = [...usersToPermissionsFromParent.keys()];
    const query = SQL`
      SELECT t.id, m.user, t.type,
        r.permissions AS role_permissions, m.permissions,
        m.permissions_for_children, m.role
      FROM threads t
      LEFT JOIN memberships m ON m.thread = t.id AND m.user IN (${userIDs})
      LEFT JOIN roles r ON r.id = m.role
      WHERE t.parent_thread_id = ${parentThreadID}
    `;
    const [ result ] = await dbQuery(query);

    const childThreadInfos = new Map();
    for (let row of result) {
      const threadID = row.id.toString();
      if (!childThreadInfos.has(threadID)) {
        childThreadInfos.set(threadID, {
          threadType: assertThreadType(row.type),
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
          childThreadInfo.threadType,
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
          changeset.push({
            operation: "update",
            userID,
            threadID,
            permissions,
            permissionsForChildren,
            role,
          });
        } else {
          changeset.push({
            operation: "delete",
            userID,
            threadID,
          });
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
  return changeset;
}

// Unlike changeRole and others, this doesn't just create a Changeset.
// It mutates the threads table by setting the type column.
// Caller still needs to save the resultant Changeset.
async function recalculateAllPermissions(
  threadID: string,
  newThreadType: ThreadType,
): Promise<Changeset> {
  const updateQuery = SQL`
    UPDATE threads SET type = ${newThreadType} WHERE id = ${threadID}
  `;
  const selectQuery = SQL`
    SELECT m.user, m.role, m.permissions, m.permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      r.permissions AS role_permissions
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN roles r ON r.id = m.role
    LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id AND pm.user = m.user
    WHERE m.thread = ${threadID}
    UNION SELECT pm.user, 0 AS role, NULL AS permissions,
      NULL AS permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      NULL AS role_permissions
    FROM threads t
    LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = pm.user
    WHERE t.id = ${threadID} AND m.thread IS NULL
  `;
  const [ [ selectResult ] ] = await Promise.all([
    dbQuery(selectQuery),
    dbQuery(updateQuery),
  ]);

  const changeset = [];
  const toUpdateDescendants = new Map();
  for (let row of selectResult) {
    if (!row.user) {
      continue;
    }
    const userID = row.user.toString();
    const role = row.role.toString();
    const oldPermissions = JSON.parse(row.permissions);
    const oldPermissionsForChildren = JSON.parse(row.permissions_for_children);
    const permissionsFromParent = JSON.parse(row.permissions_from_parent);
    const rolePermissions = JSON.parse(row.role_permissions);
    const permissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      newThreadType,
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
      changeset.push({
        operation: "update",
        userID,
        threadID,
        permissions,
        permissionsForChildren,
        role,
      });
    } else {
      changeset.push({
        operation: "delete",
        userID,
        threadID,
      });
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
    changeset.push(...descendantResults);
  }

  return changeset;
}

const defaultSubscriptionString =
  JSON.stringify({ home: false, pushNotifs: false });
const joinSubscriptionString =
  JSON.stringify({ home: true, pushNotifs: true });

async function saveMemberships(toSave: $ReadOnlyArray<RowToSave>) {
  if (toSave.length === 0) {
    return;
  }

  const time = Date.now();
  const insertRows = [];
  for (let rowToSave of toSave) {
    let subscription;
    if (rowToSave.subscription) {
      subscription = JSON.stringify(rowToSave.subscription);
    } else if (rowToSave.operation === "join") {
      subscription = joinSubscriptionString;
    } else {
      subscription = defaultSubscriptionString;
    }
    insertRows.push([
      rowToSave.userID,
      rowToSave.threadID,
      rowToSave.role,
      time,
      subscription,
      JSON.stringify(rowToSave.permissions),
      rowToSave.permissionsForChildren
        ? JSON.stringify(rowToSave.permissionsForChildren)
        : null,
      rowToSave.unread ? "1" : "0",
    ]);
  }

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
  await dbQuery(query);
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
  await dbQuery(query);
}

// Specify non-empty changedThreadIDs to force updates to be generated for those
// threads, presumably for reasons not covered in the changeset. calendarQuery
// only needs to be specified if a JOIN_THREAD update will be generated for the
// viewer, in which case it's necessary for knowing the set of entries to fetch.
type ChangesetCommitResult = {|
  ...FetchThreadInfosResult,
  viewerUpdates: $ReadOnlyArray<UpdateInfo>,
|};
async function commitMembershipChangeset(
  viewer: Viewer,
  changeset: Changeset,
  changedThreadIDs?: Set<string> = new Set(),
  calendarQuery?: ?CalendarQuery,
): Promise<ChangesetCommitResult> {
  const toJoin = [], toUpdate = [], toDelete = [];
  for (let row of changeset) {
    if (row.operation === "join") {
      toJoin.push(row);
    } else if (row.operation === "update") {
      toUpdate.push(row);
    } else if (row.operation === "delete") {
      toDelete.push(row);
    }
  }

  await Promise.all([
    saveMemberships([...toJoin, ...toUpdate]),
    deleteMemberships(toDelete),
  ]);

  const threadMembershipCreationPairs = new Set();
  const threadMembershipDeletionPairs = new Set();
  for (let rowToJoin of toJoin) {
    const { userID, threadID } = rowToJoin;
    changedThreadIDs.add(threadID);
    threadMembershipCreationPairs.add(`${userID}|${threadID}`);
  }
  for (let rowToUpdate of toUpdate) {
    const { threadID } = rowToUpdate;
    changedThreadIDs.add(threadID);
  }
  for (let rowToDelete of toDelete) {
    const { userID, threadID } = rowToDelete;
    changedThreadIDs.add(threadID);
    threadMembershipDeletionPairs.add(`${userID}|${threadID}`);
  }

  const serverThreadInfoFetchResult = await fetchServerThreadInfos();
  const { threadInfos: serverThreadInfos } = serverThreadInfoFetchResult;

  const time = Date.now();
  const updateDatas = [];
  for (let changedThreadID of changedThreadIDs) {
    const serverThreadInfo = serverThreadInfos[changedThreadID];
    for (let memberInfo of serverThreadInfo.members) {
      const pairString = `${memberInfo.id}|${serverThreadInfo.id}`;
      if (
        threadMembershipCreationPairs.has(pairString) ||
        threadMembershipDeletionPairs.has(pairString)
      ) {
        continue;
      }
      updateDatas.push({
        type: updateTypes.UPDATE_THREAD,
        userID: memberInfo.id,
        time,
        threadID: changedThreadID,
      });
    }
  }
  for (let pair of threadMembershipCreationPairs) {
    const [ userID, threadID ] = pair.split('|');
    updateDatas.push({
      type: updateTypes.JOIN_THREAD,
      userID,
      time,
      threadID,
    });
  }
  for (let pair of threadMembershipDeletionPairs) {
    const [ userID, threadID ] = pair.split('|');
    updateDatas.push({
      type: updateTypes.DELETE_THREAD,
      userID,
      time,
      threadID,
    });
  }

  const threadInfoFetchResult = rawThreadInfosFromServerThreadInfos(
    viewer,
    serverThreadInfoFetchResult,
  );
  const { viewerUpdates } = await createUpdates(
    updateDatas,
    { viewer, calendarQuery, ...threadInfoFetchResult },
  );

  return {
    ...threadInfoFetchResult,
    viewerUpdates,
  };
}

export {
  changeRole,
  recalculateAllPermissions,
  commitMembershipChangeset,
};
