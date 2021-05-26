// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';

import bots from 'lib/facts/bots';
import {
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
  getRoleForPermissions,
} from 'lib/permissions/thread-permissions';
import type { CalendarQuery } from 'lib/types/entry-types';
import {
  type ThreadPermissionsBlob,
  type ThreadRolePermissionsBlob,
  type ThreadType,
  assertThreadType,
} from 'lib/types/thread-types';
import { updateTypes, type UpdateInfo } from 'lib/types/update-types';
import type { AccountUserInfo } from 'lib/types/user-types';
import { pushAll } from 'lib/utils/array';
import { ServerError } from 'lib/utils/errors';

import {
  createUpdates,
  type UpdatesForCurrentSession,
} from '../creators/update-creator';
import { dbQuery, SQL } from '../database/database';
import {
  fetchServerThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers';
import { rescindPushNotifs } from '../push/rescind';
import { createScriptViewer } from '../session/scripts';
import type { Viewer } from '../session/viewer';
import RelationshipChangeset from '../utils/relationship-changeset';
import {
  updateDatasForUserPairs,
  updateUndirectedRelationships,
} from './relationship-updaters';

export type MembershipRowToSave = {|
  +operation: 'save',
  +intent: 'join' | 'leave' | 'none',
  +userID: string,
  +threadID: string,
  +userNeedsFullThreadDetails: boolean,
  +permissions: ?ThreadPermissionsBlob,
  +permissionsForChildren: ?ThreadPermissionsBlob,
  // null role represents by "0"
  +role: string,
  +oldRole: string,
  +unread?: boolean,
|};
type MembershipRowToDelete = {|
  +operation: 'delete',
  +intent: 'join' | 'leave' | 'none',
  +userID: string,
  +threadID: string,
  +oldRole: string,
|};
type MembershipRow = MembershipRowToSave | MembershipRowToDelete;
type Changeset = {|
  +membershipRows: MembershipRow[],
  +relationshipChangeset: RelationshipChangeset,
|};

// 0 role means to remove the user from the thread
// null role means to set the user to the default role
// string role means to set the user to the role with that ID
// -1 role means to set the user as a "ghost" (former member)
type ChangeRoleOptions = {|
  +setNewMembersToUnread?: boolean,
|};
async function changeRole(
  threadID: string,
  userIDs: $ReadOnlyArray<string>,
  role: string | -1 | 0 | null,
  options?: ChangeRoleOptions,
): Promise<?Changeset> {
  const intent = role === -1 || role === 0 ? 'leave' : 'join';
  const setNewMembersToUnread =
    options?.setNewMembersToUnread && intent === 'join';

  const membershipQuery = SQL`
    SELECT m.user, m.role, m.permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      'existing' AS row_state
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN memberships pm
      ON pm.thread = t.parent_thread_id AND pm.user = m.user
    WHERE m.thread = ${threadID}
    UNION SELECT pm.user, -1 AS role,
      NULL AS permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      'from_parent' AS row_state
    FROM threads t
    LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = pm.user
    WHERE t.id = ${threadID} AND m.thread IS NULL
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
    if (!row.user) {
      continue;
    }
    const userID = row.user.toString();
    const oldPermissionsForChildren = JSON.parse(row.permissions_for_children);
    const permissionsFromParent = JSON.parse(row.permissions_from_parent);
    roleInfo.set(userID, {
      oldRole: row.role.toString(),
      oldPermissionsForChildren,
      permissionsFromParent,
      rowState: row.row_state,
    });
  }

  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();
  const toUpdateDescendants = new Map();
  const existingMemberIDs = [...new Set(roleInfo.keys())];
  relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
  for (const userID of userIDs) {
    let oldPermissionsForChildren = null;
    let permissionsFromParent = null;
    let hadMembershipRow = false;
    let oldRole;
    const userRoleInfo = roleInfo.get(userID);
    if (userRoleInfo) {
      hadMembershipRow = userRoleInfo.rowState === 'existing';
      oldRole = userRoleInfo.oldRole;
      if (hadMembershipRow && oldRole === roleThreadResult.roleColumnValue) {
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
    }

    const permissions = makePermissionsBlob(
      roleThreadResult.rolePermissions,
      permissionsFromParent,
      threadID,
      roleThreadResult.threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);

    if (permissions) {
      if (role === -1) {
        console.warn(
          `changeRole called for -1 role, but found non-null permissions for ` +
            `userID ${userID} and threadID ${threadID}`,
        );
      }
      const candidateRole =
        Number(roleThreadResult.roleColumnValue) >= 0
          ? roleThreadResult.roleColumnValue
          : '0';
      const newRole = getRoleForPermissions(candidateRole, permissions);
      if (
        (intent === 'join' && Number(newRole) <= 0) ||
        (intent === 'leave' && Number(newRole) > 0)
      ) {
        throw new ServerError('invalid_parameters');
      }
      const userBecameMember =
        (!oldRole || Number(oldRole) <= 0) && Number(newRole) > 0;
      membershipRows.push({
        operation: 'save',
        intent,
        userID,
        threadID,
        userNeedsFullThreadDetails: userBecameMember,
        permissions,
        permissionsForChildren,
        role: newRole,
        oldRole: oldRole ?? '-1',
        unread: userBecameMember && setNewMembersToUnread,
      });
    } else {
      if (intent === 'join') {
        throw new ServerError('invalid_parameters');
      }
      membershipRows.push({
        operation: 'delete',
        intent,
        userID,
        threadID,
        oldRole: oldRole ?? '-1',
      });
    }

    if (permissions && !hadMembershipRow) {
      relationshipChangeset.setRelationshipsNeeded(userID, existingMemberIDs);
    }

    if (!_isEqual(permissionsForChildren)(oldPermissionsForChildren)) {
      toUpdateDescendants.set(userID, permissionsForChildren);
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipChangeset: descendantRelationshipChangeset,
    } = await updateDescendantPermissions(threadID, toUpdateDescendants);
    pushAll(membershipRows, descendantMembershipRows);
    relationshipChangeset.addAll(descendantRelationshipChangeset);
  }

  return { membershipRows, relationshipChangeset };
}

type RoleThreadResult = {|
  +roleColumnValue: string,
  +threadType: ThreadType,
  +rolePermissions: ?ThreadRolePermissionsBlob,
|};
async function changeRoleThreadQuery(
  threadID: string,
  role: string | -1 | 0 | null,
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
  } else if (role === -1) {
    const query = SQL`SELECT type FROM threads WHERE id = ${threadID}`;
    const [result] = await dbQuery(query);
    if (result.length === 0) {
      return null;
    }
    const row = result[0];
    return {
      roleColumnValue: '-1',
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
  const relationshipChangeset = new RelationshipChangeset();
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
      const existingMemberIDs = [...userInfos.keys()];
      relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
      const usersForNextLayer = new Map();
      for (const [
        userID,
        permissionsFromParent,
      ] of usersToPermissionsFromParent) {
        const userInfo = userInfos.get(userID);
        const role =
          userInfo && Number(userInfo.role) > 0 ? userInfo.role : '0';
        const rolePermissions = userInfo?.rolePermissions;
        const oldPermissions = userInfo?.permissions;
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
            operation: 'save',
            intent: 'none',
            userID,
            threadID,
            userNeedsFullThreadDetails: false,
            permissions,
            permissionsForChildren,
            role: getRoleForPermissions(role, permissions),
            oldRole: userInfo?.role ?? '-1',
          });
        } else {
          membershipRows.push({
            operation: 'delete',
            intent: 'none',
            userID,
            threadID,
            oldRole: userInfo?.role ?? '-1',
          });
        }

        if (permissions && !userInfo) {
          // If there was no membership row before, and we are creating one,
          // we'll need to make sure the new member has a relationship row with
          // each existing member. We assume whoever called us will handle
          // making sure the set of new members all have relationship rows with
          // each other.
          relationshipChangeset.setRelationshipsNeeded(
            userID,
            existingMemberIDs,
          );
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
  return { membershipRows, relationshipChangeset };
}

async function recalculateThreadPermissions(
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
    UNION SELECT pm.user, -1 AS role, NULL AS permissions,
      NULL AS permissions_for_children,
      pm.permissions_for_children AS permissions_from_parent,
      NULL AS role_permissions, 'from_parent' AS row_state
    FROM threads t
    LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = pm.user
    WHERE t.id = ${threadID} AND m.thread IS NULL
  `;
  const [selectResult] = await dbQuery(selectQuery);

  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();
  const toUpdateDescendants = new Map();
  const existingMemberIDs = selectResult
    .filter((row) => row.user && row.row_state === 'existing')
    .map((row) => row.user.toString());
  relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);

  for (const row of selectResult) {
    if (!row.user) {
      continue;
    }
    const userID = row.user.toString();
    const role = row.role >= 0 ? row.role.toString() : '0';
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
        operation: 'save',
        intent: 'none',
        userID,
        threadID,
        userNeedsFullThreadDetails: false,
        permissions,
        permissionsForChildren,
        role: getRoleForPermissions(role, permissions),
        oldRole: row.role.toString(),
      });
    } else {
      membershipRows.push({
        operation: 'delete',
        intent: 'none',
        userID,
        threadID,
        oldRole: row.role.toString(),
      });
    }

    if (permissions && !hadMembershipRow) {
      // If there was no membership row before, and we are creating one,
      // we'll need to make sure the new member has a relationship row with
      // each existing member. We assume all the new members already have
      // relationship rows with each other, since they must all share the same
      // parent thread.
      relationshipChangeset.setRelationshipsNeeded(userID, existingMemberIDs);
    }

    if (!_isEqual(permissionsForChildren)(oldPermissionsForChildren)) {
      toUpdateDescendants.set(userID, permissionsForChildren);
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipChangeset: descendantRelationshipChangeset,
    } = await updateDescendantPermissions(threadID, toUpdateDescendants);
    pushAll(membershipRows, descendantMembershipRows);
    relationshipChangeset.addAll(descendantRelationshipChangeset);
  }

  return { membershipRows, relationshipChangeset };
}

const defaultSubscriptionString = JSON.stringify({
  home: false,
  pushNotifs: false,
});
const joinSubscriptionString = JSON.stringify({ home: true, pushNotifs: true });

const membershipInsertBatchSize = 50;

async function saveMemberships(toSave: $ReadOnlyArray<MembershipRowToSave>) {
  if (toSave.length === 0) {
    return;
  }

  const time = Date.now();
  const insertRows = [];
  for (const rowToSave of toSave) {
    insertRows.push([
      rowToSave.userID,
      rowToSave.threadID,
      rowToSave.role,
      time,
      rowToSave.intent === 'join'
        ? joinSubscriptionString
        : defaultSubscriptionString,
      rowToSave.permissions ? JSON.stringify(rowToSave.permissions) : null,
      rowToSave.permissionsForChildren
        ? JSON.stringify(rowToSave.permissionsForChildren)
        : null,
      rowToSave.unread ? 1 : 0,
      0,
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
  while (insertRows.length > 0) {
    const batch = insertRows.splice(0, membershipInsertBatchSize);
    const query = SQL`
      INSERT INTO memberships (user, thread, role, creation_time, subscription,
        permissions, permissions_for_children, last_message, last_read_message)
      VALUES ${batch}
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
}

async function deleteMemberships(
  toDelete: $ReadOnlyArray<MembershipRowToDelete>,
) {
  if (toDelete.length === 0) {
    return;
  }

  const time = Date.now();
  const insertRows = toDelete.map((rowToDelete) => [
    rowToDelete.userID,
    rowToDelete.threadID,
    -1,
    time,
    defaultSubscriptionString,
    null,
    null,
    0,
    0,
  ]);

  while (insertRows.length > 0) {
    const batch = insertRows.splice(0, membershipInsertBatchSize);
    const query = SQL`
      INSERT INTO memberships (user, thread, role, creation_time, subscription,
        permissions, permissions_for_children, last_message, last_read_message)
      VALUES ${batch}
      ON DUPLICATE KEY UPDATE
        role = -1,
        permissions = NULL,
        permissions_for_children = NULL,
        subscription = ${defaultSubscriptionString},
        last_message = 0,
        last_read_message = 0
    `;
    await dbQuery(query);
  }
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
  const { membershipRows, relationshipChangeset } = changeset;

  const membershipRowMap = new Map();
  for (const row of membershipRows) {
    const { userID, threadID } = row;
    changedThreadIDs.add(threadID);

    const pairString = `${userID}|${threadID}`;
    const existing = membershipRowMap.get(pairString);
    invariant(
      !existing || existing.intent === 'none' || row.intent === 'none',
      `multiple intents provided for ${pairString}`,
    );
    if (!existing || existing.intent === 'none') {
      membershipRowMap.set(pairString, row);
    }
  }

  const toSave = [],
    toDelete = [],
    toRescindPushNotifs = [];
  for (const row of membershipRowMap.values()) {
    if (
      row.operation === 'delete' ||
      (row.operation === 'save' && Number(row.role) <= 0)
    ) {
      const { userID, threadID } = row;
      toRescindPushNotifs.push({ userID, threadID });
    }
    if (row.operation === 'delete') {
      toDelete.push(row);
    } else {
      toSave.push(row);
    }
  }

  const threadsToSavedUsers = new Map();
  for (const row of membershipRowMap.values()) {
    const { userID, threadID } = row;
    let savedUsers = threadsToSavedUsers.get(threadID);
    if (!savedUsers) {
      savedUsers = [];
      threadsToSavedUsers.set(threadID, savedUsers);
    }
    savedUsers.push(userID);
  }
  for (const savedUsers of threadsToSavedUsers.values()) {
    relationshipChangeset.setAllRelationshipsNeeded(savedUsers);
  }
  const relationshipRows = relationshipChangeset.getRows();

  await Promise.all([
    saveMemberships(toSave),
    deleteMemberships(toDelete),
    updateUndirectedRelationships(relationshipRows),
    rescindPushNotifsForMemberDeletion(toRescindPushNotifs),
  ]);

  // We fetch all threads here because old clients still expect the full list of
  // threads on most thread operations. Once verifyClientSupported gates on
  // codeVersion 62, we can add a WHERE clause on changedThreadIDs here
  const serverThreadInfoFetchResult = await fetchServerThreadInfos();
  const { threadInfos: serverThreadInfos } = serverThreadInfoFetchResult;

  const time = Date.now();
  const updateDatas = updateDatasForUserPairs(
    relationshipRows.map(({ user1, user2 }) => [user1, user2]),
  );
  for (const changedThreadID of changedThreadIDs) {
    const serverThreadInfo = serverThreadInfos[changedThreadID];
    for (const memberInfo of serverThreadInfo.members) {
      const pairString = `${memberInfo.id}|${serverThreadInfo.id}`;
      const membershipRow = membershipRowMap.get(pairString);
      if (membershipRow) {
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
    if (row.operation === 'delete' || row.role === '-1') {
      if (row.oldRole !== '-1') {
        updateDatas.push({
          type: updateTypes.DELETE_THREAD,
          userID,
          time,
          threadID,
        });
      }
    } else if (row.userNeedsFullThreadDetails) {
      updateDatas.push({
        type: updateTypes.JOIN_THREAD,
        userID,
        time,
        threadID,
      });
    } else {
      updateDatas.push({
        type: updateTypes.UPDATE_THREAD,
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

const rescindPushNotifsBatchSize = 3;
async function rescindPushNotifsForMemberDeletion(
  toRescindPushNotifs: $ReadOnlyArray<{| +userID: string, +threadID: string |}>,
): Promise<void> {
  const queue = [...toRescindPushNotifs];
  while (queue.length > 0) {
    const batch = queue.splice(0, rescindPushNotifsBatchSize);
    await Promise.all(
      batch.map(({ userID, threadID }) =>
        rescindPushNotifs(
          SQL`n.thread = ${threadID} AND n.user = ${userID}`,
          SQL`IF(m.thread = ${threadID}, NULL, m.thread)`,
        ),
      ),
    );
  }
}

async function recalculateAllThreadPermissions() {
  const getAllThreads = SQL`SELECT id, type FROM threads`;
  const [result] = await dbQuery(getAllThreads);

  // We handle each thread one-by-one to avoid a situation where a permission
  // calculation for a child thread, done during a call to
  // recalculateThreadPermissions for the parent thread, can be incorrectly
  // overriden by a call to recalculateThreadPermissions for the child thread.
  // If the changeset resulting from the parent call isn't committed before the
  // calculation is done for the child, the calculation done for the child can
  // be incorrect.
  const viewer = createScriptViewer(bots.squadbot.userID);
  for (const row of result) {
    const threadID = row.id.toString();
    const threadType = assertThreadType(row.type);
    const changeset = await recalculateThreadPermissions(threadID, threadType);
    await commitMembershipChangeset(viewer, changeset);
  }
}

export {
  changeRole,
  recalculateThreadPermissions,
  saveMemberships,
  commitMembershipChangeset,
  recalculateAllThreadPermissions,
};
