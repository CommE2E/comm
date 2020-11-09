// @flow

import {
  type ThreadPermissionsBlob,
  type ThreadRolePermissionsBlob,
  type ThreadType,
  assertThreadType,
} from 'lib/types/thread-types';
import type { ThreadSubscription } from 'lib/types/subscription-types';
import type { Viewer } from '../session/viewer';
import { updateTypes, type UpdateInfo } from 'lib/types/update-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { AccountUserInfo } from 'lib/types/user-types';
import {
  type UndirectedRelationshipRow,
  undirectedStatus,
} from 'lib/types/relationship-types';

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';
import _uniqWith from 'lodash/fp/uniqWith';

import {
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
} from 'lib/permissions/thread-permissions';
import { sortIDs } from 'lib/shared/relationship-utils';
import { ServerError } from 'lib/utils/errors';
import { cartesianProduct } from 'lib/utils/array';

import {
  fetchServerThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers';
import {
  createUpdates,
  type UpdatesForCurrentSession,
} from '../creators/update-creator';
import {
  updateDatasForUserPairs,
  updateUndirectedRelationships,
} from '../updaters/relationship-updaters';
import { rescindPushNotifs } from '../push/rescind';

import { dbQuery, SQL, mergeOrConditions } from '../database/database';

export type MembershipRowToSave = {|
  operation: 'update' | 'join',
  userID: string,
  threadID: string,
  permissions: ?ThreadPermissionsBlob,
  permissionsForChildren: ?ThreadPermissionsBlob,
  // null role represents by "0"
  role: string,
  subscription?: ThreadSubscription,
  lastMessage?: number,
  lastReadMessage?: number,
|};
type MembershipRowToDelete = {|
  operation: 'delete',
  userID: string,
  threadID: string,
|};
type MembershipRow = MembershipRowToSave | MembershipRowToDelete;
type Changeset = {|
  membershipRows: MembershipRow[],
  relationshipRows: UndirectedRelationshipRow[],
|};

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
    WHERE m.thread = ${threadID}
  `;
  const [[membershipResult], roleThreadResult] = await Promise.all([
    dbQuery(membershipQuery),
    changeRoleThreadQuery(threadID, role),
  ]);
  if (!roleThreadResult) {
    return null;
  }

  const roleInfo = new Map();
  for (const row of membershipResult) {
    const userID = row.user.toString();
    const oldPermissionsForChildren = row.permissions_for_children;
    const permissionsFromParent = row.permissions_from_parent;
    roleInfo.set(userID, {
      oldRole: row.role.toString(),
      oldPermissionsForChildren,
      permissionsFromParent,
    });
  }

  const relationshipRows = [];
  const membershipRows = [];
  const toUpdateDescendants = new Map();
  const memberIDs = new Set(roleInfo.keys());
  for (const userID of userIDs) {
    let oldPermissionsForChildren = null;
    let permissionsFromParent = null;
    let hadMembershipRow = false;
    const userRoleInfo = roleInfo.get(userID);
    if (userRoleInfo) {
      const oldRole = userRoleInfo.oldRole;
      if (oldRole === roleThreadResult.roleColumnValue) {
        // If the old role is the same as the new one, we have nothing to update
        continue;
      } else if (Number(oldRole) > 0 && role === null) {
        // In the case where we're just trying to add somebody to a thread, if
        // they already have a role with a nonzero role then we don't need to do
        // anything
        continue;
      }
      oldPermissionsForChildren = userRoleInfo.oldPermissionsForChildren;
      permissionsFromParent = userRoleInfo.permissionsFromParent;
      hadMembershipRow = true;
    }

    const permissions = makePermissionsBlob(
      roleThreadResult.rolePermissions,
      permissionsFromParent,
      threadID,
      roleThreadResult.threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);

    if (permissions) {
      membershipRows.push({
        operation:
          roleThreadResult.roleColumnValue !== '0' &&
          (!userRoleInfo || Number(userRoleInfo.oldRole) <= 0)
            ? 'join'
            : 'update',
        userID,
        threadID,
        permissions,
        permissionsForChildren,
        role: roleThreadResult.roleColumnValue,
      });
    } else {
      membershipRows.push({
        operation: 'delete',
        userID,
        threadID,
      });
    }

    if (permissions && !hadMembershipRow) {
      for (const currentUserID of memberIDs) {
        if (userID !== currentUserID) {
          const [user1, user2] = sortIDs(userID, currentUserID);
          relationshipRows.push({
            user1,
            user2,
            status: undirectedStatus.KNOW_OF,
          });
        }
      }
      memberIDs.add(userID);
    }

    if (!_isEqual(permissionsForChildren)(oldPermissionsForChildren)) {
      toUpdateDescendants.set(userID, permissionsForChildren);
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipRows: descendantRelationshipRows,
    } = await updateDescendantPermissions(threadID, toUpdateDescendants);
    membershipRows.push(...descendantMembershipRows);
    relationshipRows.push(...descendantRelationshipRows);
  }

  return { membershipRows, relationshipRows };
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
    const [result] = await dbQuery(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: '0',
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
    const [result] = await dbQuery(query);
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
    const [result] = await dbQuery(query);
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
  const stack = [[initialParentThreadID, initialUsersToPermissionsFromParent]];
  const membershipRows = [];
  const relationshipRows = [];
  while (stack.length > 0) {
    const [parentThreadID, usersToPermissionsFromParent] = stack.shift();

    const query = SQL`
      SELECT t.id, m.user, t.type,
        r.permissions AS role_permissions, m.permissions,
        m.permissions_for_children, m.role
      FROM threads t
      LEFT JOIN memberships m ON m.thread = t.id
      LEFT JOIN roles r ON r.id = m.role
      WHERE t.parent_thread_id = ${parentThreadID}
    `;
    const [result] = await dbQuery(query);

    const childThreadInfos = new Map();
    for (const row of result) {
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
      childThreadInfo.userInfos.set(userID, {
        role: row.role.toString(),
        rolePermissions: row.role_permissions,
        permissions: row.permissions,
        permissionsForChildren: row.permissions_for_children,
      });
    }

    for (const [threadID, childThreadInfo] of childThreadInfos) {
      const userInfos = childThreadInfo.userInfos;
      const usersForNextLayer = new Map();
      for (const [
        userID,
        permissionsFromParent,
      ] of usersToPermissionsFromParent) {
        const userInfo = userInfos.get(userID);
        const role =
          userInfo && Number(userInfo.role) > 0 ? userInfo.role : '0';
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
          membershipRows.push({
            operation: 'update',
            userID,
            threadID,
            permissions,
            permissionsForChildren,
            role,
          });
        } else {
          membershipRows.push({
            operation: 'delete',
            userID,
            threadID,
          });
        }

        if (permissions && !userInfo) {
          // If there was no membership row before, and we are creating one,
          // we'll need to make sure the new member has a relationship row with
          // each existing member. We assume whoever called us will handle
          // making sure the set of new members all have relationship rows with
          // each other.
          for (const [existingMemberID] of userInfos) {
            const [user1, user2] = sortIDs(existingMemberID, userID);
            const status = undirectedStatus.KNOW_OF;
            relationshipRows.push({ user1, user2, status });
          }
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
  return { membershipRows, relationshipRows };
}

async function recalculateAllPermissions(
  threadID: string,
  threadType: ThreadType,
): Promise<Changeset> {
  const selectQuery = SQL`
    SELECT m.user, m.role, m.permissions, m.permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      r.permissions AS role_permissions, 'existing' AS row_state
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN roles r ON r.id = m.role
    LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id
      AND pm.user = m.user
    WHERE m.thread = ${threadID}
    UNION SELECT pm.user, 0 AS role, NULL AS permissions,
      NULL AS permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      NULL AS role_permissions, 'from_parent' AS row_state
    FROM threads t
    LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = pm.user
    WHERE t.id = ${threadID} AND m.thread IS NULL
  `;
  const [selectResult] = await dbQuery(selectQuery);

  const relationshipRows = [];
  const membershipRows = [];
  const toUpdateDescendants = new Map();
  const existingMemberIDs = selectResult
    .filter((row) => row.user && row.row_state === 'existing')
    .map((row) => row.user.toString());

  for (const row of selectResult) {
    if (!row.user) {
      continue;
    }
    const userID = row.user.toString();
    const role = row.role.toString();
    const oldPermissions = JSON.parse(row.permissions);
    const oldPermissionsForChildren = JSON.parse(row.permissions_for_children);
    const permissionsFromParent = JSON.parse(row.permissions_from_parent);
    const rolePermissions = JSON.parse(row.role_permissions);
    const hadMembershipRow = row.row_state === 'existing';

    const permissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      threadType,
    );
    if (_isEqual(permissions)(oldPermissions)) {
      // This thread and all of its children need no updates, since its
      // permissions are unchanged by this operation
      continue;
    }
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);

    if (permissions) {
      membershipRows.push({
        operation: 'update',
        userID,
        threadID,
        permissions,
        permissionsForChildren,
        role,
      });
    } else {
      membershipRows.push({
        operation: 'delete',
        userID,
        threadID,
      });
    }

    if (permissions && !hadMembershipRow) {
      // If there was no membership row before, and we are creating one,
      // we'll need to make sure the new member has a relationship row with
      // each existing member. We assume all the new members already have
      // relationship rows with each other, since they must all share the same
      // parent thread.
      for (const existingMemberID of existingMemberIDs) {
        const [user1, user2] = sortIDs(userID, existingMemberID);
        const status = undirectedStatus.KNOW_OF;
        relationshipRows.push({ user1, user2, status });
      }
    }

    if (!_isEqual(permissionsForChildren)(oldPermissionsForChildren)) {
      toUpdateDescendants.set(userID, permissionsForChildren);
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipRows: descendantRelationshipRows,
    } = await updateDescendantPermissions(threadID, toUpdateDescendants);

    membershipRows.push(...descendantMembershipRows);
    relationshipRows.push(...descendantRelationshipRows);
  }

  return { membershipRows, relationshipRows };
}

const defaultSubscriptionString = JSON.stringify({
  home: false,
  pushNotifs: false,
});
const joinSubscriptionString = JSON.stringify({ home: true, pushNotifs: true });

async function saveMemberships(toSave: $ReadOnlyArray<MembershipRowToSave>) {
  if (toSave.length === 0) {
    return;
  }

  const time = Date.now();
  const insertRows = [];
  for (const rowToSave of toSave) {
    let subscription;
    if (rowToSave.subscription) {
      subscription = JSON.stringify(rowToSave.subscription);
    } else if (rowToSave.operation === 'join') {
      subscription = joinSubscriptionString;
    } else {
      subscription = defaultSubscriptionString;
    }
    const lastMessage = rowToSave.lastMessage ?? 0;
    const lastReadMessage = rowToSave.lastReadMessage ?? 0;
    insertRows.push([
      rowToSave.userID,
      rowToSave.threadID,
      rowToSave.role,
      time,
      subscription,
      rowToSave.permissions ? JSON.stringify(rowToSave.permissions) : null,
      rowToSave.permissionsForChildren
        ? JSON.stringify(rowToSave.permissionsForChildren)
        : null,
      lastMessage,
      lastReadMessage,
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
      permissions, permissions_for_children, last_message, last_read_message)
    VALUES ${insertRows}
    ON DUPLICATE KEY UPDATE
      subscription = IF(
        (role <= 0 AND VALUES(role) > 0)
          OR (role > 0 AND VALUES(role) <= 0),
        VALUES(subscription),
        subscription
      ),
      role = VALUES(role),
      permissions = VALUES(permissions),
      permissions_for_children = VALUES(permissions_for_children)
  `;
  await dbQuery(query);
}

async function deleteMemberships(
  toDelete: $ReadOnlyArray<MembershipRowToDelete>,
) {
  if (toDelete.length === 0) {
    return;
  }
  const deleteRows = toDelete.map(
    (rowToDelete) =>
      SQL`(user = ${rowToDelete.userID} AND thread = ${rowToDelete.threadID})`,
  );
  const conditions = mergeOrConditions(deleteRows);
  const query = SQL`
    UPDATE memberships 
    SET role = -1, permissions = NULL, permissions_for_children = NULL, 
      subscription = ${defaultSubscriptionString}, last_message = 0,
      last_read_message = 0
    WHERE `;
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
  userInfos: { [id: string]: AccountUserInfo },
|};
async function commitMembershipChangeset(
  viewer: Viewer,
  changeset: Changeset,
  {
    changedThreadIDs = new Set(),
    calendarQuery,
    updatesForCurrentSession = 'return',
  }: {|
    changedThreadIDs?: Set<string>,
    calendarQuery?: ?CalendarQuery,
    updatesForCurrentSession?: UpdatesForCurrentSession,
  |} = {},
): Promise<ChangesetCommitResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const { membershipRows, relationshipRows } = changeset;

  const membershipRowMap = new Map();
  for (const row of membershipRows) {
    const { userID, threadID } = row;
    changedThreadIDs.add(threadID);

    const pairString = `${userID}|${threadID}`;
    const existing = membershipRowMap.get(pairString);
    if (
      !existing ||
      (existing.operation !== 'join' &&
        (row.operation === 'join' ||
          (row.operation === 'delete' && existing.operation === 'update')))
    ) {
      membershipRowMap.set(pairString, row);
    }
  }

  const toSave = [],
    toDelete = [],
    rescindPromises = [];
  for (const row of membershipRowMap.values()) {
    if (
      row.operation === 'delete' ||
      (row.operation === 'update' && Number(row.role) <= 0)
    ) {
      const { userID, threadID } = row;
      rescindPromises.push(
        rescindPushNotifs(
          SQL`n.thread = ${threadID} AND n.user = ${userID}`,
          SQL`IF(m.thread = ${threadID}, NULL, m.thread)`,
        ),
      );
    }
    if (row.operation === 'delete') {
      toDelete.push(row);
    } else {
      toSave.push(row);
    }
  }
  const uniqueRelationshipRows = _uniqWith(_isEqual)(relationshipRows);
  await Promise.all([
    saveMemberships(toSave),
    deleteMemberships(toDelete),
    updateUndirectedRelationships(uniqueRelationshipRows),
    ...rescindPromises,
  ]);

  // We fetch all threads here because old clients still expect the full list of
  // threads on most thread operations. Once verifyClientSupported gates on
  // codeVersion 62, we can add a WHERE clause on changedThreadIDs here
  const serverThreadInfoFetchResult = await fetchServerThreadInfos();
  const { threadInfos: serverThreadInfos } = serverThreadInfoFetchResult;

  const time = Date.now();
  const updateDatas = updateDatasForUserPairs(
    uniqueRelationshipRows.map(({ user1, user2 }) => [user1, user2]),
  );
  for (const changedThreadID of changedThreadIDs) {
    const serverThreadInfo = serverThreadInfos[changedThreadID];
    for (const memberInfo of serverThreadInfo.members) {
      const pairString = `${memberInfo.id}|${serverThreadInfo.id}`;
      const membershipRow = membershipRowMap.get(pairString);
      if (membershipRow && membershipRow.operation !== 'update') {
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
  for (const row of membershipRowMap.values()) {
    const { userID, threadID } = row;
    if (row.operation === 'join') {
      updateDatas.push({
        type: updateTypes.JOIN_THREAD,
        userID,
        time,
        threadID,
      });
    } else if (row.operation === 'delete') {
      updateDatas.push({
        type: updateTypes.DELETE_THREAD,
        userID,
        time,
        threadID,
      });
    }
  }

  const threadInfoFetchResult = rawThreadInfosFromServerThreadInfos(
    viewer,
    serverThreadInfoFetchResult,
  );
  const { viewerUpdates, userInfos } = await createUpdates(updateDatas, {
    viewer,
    calendarQuery,
    ...threadInfoFetchResult,
    updatesForCurrentSession,
  });

  return {
    ...threadInfoFetchResult,
    userInfos,
    viewerUpdates,
  };
}

function setJoinsToUnread(
  rows: MembershipRow[],
  exceptViewerID: string,
  exceptThreadID: string,
) {
  for (const row of rows) {
    if (
      row.operation === 'join' &&
      (row.userID !== exceptViewerID || row.threadID !== exceptThreadID)
    ) {
      row.lastMessage = 1;
      row.lastReadMessage = 0;
    }
  }
}

function getRelationshipRowsForUsers(
  viewerID: string,
  userIDs: $ReadOnlyArray<string>,
): UndirectedRelationshipRow[] {
  return cartesianProduct([viewerID], userIDs).map((pair) => {
    const [user1, user2] = sortIDs(...pair);
    const status = undirectedStatus.KNOW_OF;
    return { user1, user2, status };
  });
}

function getParentThreadRelationshipRowsForNewUsers(
  threadID: string,
  recalculateMembershipRows: MembershipRow[],
  newMemberIDs: $ReadOnlyArray<string>,
): UndirectedRelationshipRow[] {
  const parentMemberIDs = recalculateMembershipRows
    .map((rowToSave) => rowToSave.userID)
    .filter((userID) => !newMemberIDs.includes(userID));
  const newUserIDs = newMemberIDs.filter(
    (memberID) =>
      !recalculateMembershipRows.find(
        (rowToSave) =>
          rowToSave.userID === memberID &&
          rowToSave.threadID === threadID &&
          rowToSave.operation !== 'delete',
      ),
  );
  return cartesianProduct(parentMemberIDs, newUserIDs).map((pair) => {
    const [user1, user2] = sortIDs(...pair);
    const status = undirectedStatus.KNOW_OF;
    return { user1, user2, status };
  });
}

export {
  changeRole,
  recalculateAllPermissions,
  saveMemberships,
  commitMembershipChangeset,
  setJoinsToUnread,
  getRelationshipRowsForUsers,
  getParentThreadRelationshipRowsForNewUsers,
};
