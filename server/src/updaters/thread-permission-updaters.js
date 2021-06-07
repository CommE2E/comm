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
type ChangeRoleMemberInfo = {|
  permissionsFromParent?: ?ThreadPermissionsBlob,
  memberOfContainingThread?: boolean,
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
    SELECT user, role, permissions_for_children
    FROM memberships
    WHERE thread = ${threadID}
  `;
  const parentMembershipQuery = SQL`
    SELECT pm.user, pm.permissions_for_children AS permissions_from_parent
    FROM threads t
    INNER JOIN memberships pm ON pm.thread = t.parent_thread_id
    WHERE t.id = ${threadID} AND pm.user IN (${userIDs})
  `;
  const containingMembershipQuery = SQL`
    SELECT cm.user, cm.role AS containing_role
    FROM threads t
    INNER JOIN memberships cm ON cm.thread = t.containing_thread_id
    WHERE t.id = ${threadID} AND cm.user IN (${userIDs})
  `;
  const [
    [membershipResults],
    [parentMembershipResults],
    containingMembershipResults,
    roleThreadResult,
  ] = await Promise.all([
    dbQuery(membershipQuery),
    dbQuery(parentMembershipQuery),
    (async () => {
      if (intent === 'leave') {
        // Membership in the container only needs to be checked for members
        return [];
      }
      const [result] = await dbQuery(containingMembershipQuery);
      return result;
    })(),
    changeRoleThreadQuery(threadID, role),
  ]);

  const {
    roleColumnValue: intendedRole,
    threadType,
    hasContainingThreadID,
    rolePermissions: intendedRolePermissions,
  } = roleThreadResult;

  const existingMembershipInfo = new Map();
  for (const row of membershipResults) {
    const userID = row.user.toString();
    existingMembershipInfo.set(userID, {
      oldRole: row.role.toString(),
      oldPermissionsForChildren: row.permissions_for_children,
    });
  }

  const ancestorMembershipInfo: Map<string, ChangeRoleMemberInfo> = new Map();
  for (const row of parentMembershipResults) {
    const userID = row.user.toString();
    ancestorMembershipInfo.set(userID, {
      permissionsFromParent: row.permissions_from_parent,
    });
  }
  for (const row of containingMembershipResults) {
    const userID = row.user.toString();
    const ancestorMembership = ancestorMembershipInfo.get(userID);
    if (ancestorMembership) {
      ancestorMembership.memberOfContainingThread = row.containing_role > 0;
    } else {
      ancestorMembershipInfo.set(userID, {
        memberOfContainingThread: row.containing_role > 0,
      });
    }
  }

  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();
  const toUpdateDescendants = new Map();
  const existingMemberIDs = [...existingMembershipInfo.keys()];
  relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
  for (const userID of userIDs) {
    let oldRole;
    let oldPermissionsForChildren = null;
    const existingMembership = existingMembershipInfo.get(userID);
    if (existingMembership) {
      if (oldRole === intendedRole) {
        // If the old role is the same as the new one, we have nothing to update
        continue;
      } else if (Number(oldRole) > 0 && role === null) {
        // In the case where we're just trying to add somebody to a thread, if
        // they already have a role with a nonzero role then we don't need to do
        // anything
        continue;
      }
      oldPermissionsForChildren = existingMembership.oldPermissionsForChildren;
      oldRole = existingMembership.oldRole;
    }

    let permissionsFromParent = null;
    let memberOfContainingThread = false;
    const ancestorMembership = ancestorMembershipInfo.get(userID);
    if (ancestorMembership) {
      permissionsFromParent = ancestorMembership.permissionsFromParent;
      memberOfContainingThread = ancestorMembership.memberOfContainingThread;
    }
    if (!hasContainingThreadID) {
      memberOfContainingThread = true;
    }

    const rolePermissions = memberOfContainingThread
      ? intendedRolePermissions
      : null;
    const targetRole = memberOfContainingThread ? intendedRole : '0';

    const permissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);

    if (permissions && role === -1) {
      console.warn(
        `changeRole called for -1 role, but found non-null permissions for ` +
          `userID ${userID} and threadID ${threadID}`,
      );
    }
    const newRole = getRoleForPermissions(targetRole, permissions);
    const userBecameMember =
      (!oldRole || Number(oldRole) <= 0) && Number(newRole) > 0;
    const userLostMembership =
      oldRole && Number(oldRole) > 0 && Number(newRole) <= 0;

    if (permissions) {
      if (
        (intent === 'join' && Number(newRole) <= 0) ||
        (intent === 'leave' && Number(newRole) > 0)
      ) {
        throw new ServerError('invalid_parameters');
      }
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

    if (permissions && !existingMembership) {
      relationshipChangeset.setRelationshipsNeeded(userID, existingMemberIDs);
    }

    if (
      userLostMembership ||
      !_isEqual(permissionsForChildren)(oldPermissionsForChildren)
    ) {
      toUpdateDescendants.set(userID, {
        permissionsFromParent: permissionsForChildren,
      });
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipChangeset: descendantRelationshipChangeset,
    } = await updateDescendantPermissions({
      threadID,
      changesByUser: toUpdateDescendants,
    });
    pushAll(membershipRows, descendantMembershipRows);
    relationshipChangeset.addAll(descendantRelationshipChangeset);
  }

  return { membershipRows, relationshipChangeset };
}

type RoleThreadResult = {|
  +roleColumnValue: string,
  +threadType: ThreadType,
  +hasContainingThreadID: boolean,
  +rolePermissions: ?ThreadRolePermissionsBlob,
|};
async function changeRoleThreadQuery(
  threadID: string,
  role: string | -1 | 0 | null,
): Promise<RoleThreadResult> {
  if (role === 0 || role === -1) {
    const query = SQL`
      SELECT type, containing_thread_id FROM threads WHERE id = ${threadID}
    `;
    const [result] = await dbQuery(query);
    if (result.length === 0) {
      throw new ServerError('internal_error');
    }
    const row = result[0];
    return {
      roleColumnValue: role.toString(),
      threadType: assertThreadType(row.type),
      hasContainingThreadID: row.containing_thread_id !== null,
      rolePermissions: null,
    };
  } else if (role !== null) {
    const query = SQL`
      SELECT t.type, r.permissions, t.containing_thread_id
      FROM threads t
      INNER JOIN roles r ON r.thread = t.id AND r.id = ${role}
      WHERE t.id = ${threadID}
    `;
    const [result] = await dbQuery(query);
    if (result.length === 0) {
      throw new ServerError('internal_error');
    }
    const row = result[0];
    return {
      roleColumnValue: role,
      threadType: assertThreadType(row.type),
      hasContainingThreadID: row.containing_thread_id !== null,
      rolePermissions: row.permissions,
    };
  } else {
    const query = SQL`
      SELECT t.type, t.default_role, r.permissions, t.containing_thread_id
      FROM threads t
      INNER JOIN roles r ON r.thread = t.id AND r.id = t.default_role
      WHERE t.id = ${threadID}
    `;
    const [result] = await dbQuery(query);
    if (result.length === 0) {
      throw new ServerError('internal_error');
    }
    const row = result[0];
    return {
      roleColumnValue: row.default_role.toString(),
      threadType: assertThreadType(row.type),
      hasContainingThreadID: row.containing_thread_id !== null,
      rolePermissions: row.permissions,
    };
  }
}

type ChangedAncestor = {|
  +threadID: string,
  +changesByUser: Map<string, AncestorChanges>,
|};
type AncestorChanges = {|
  +permissionsFromParent: ?ThreadPermissionsBlob,
|};

async function updateDescendantPermissions(
  initialChangedAncestor: ChangedAncestor,
): Promise<Changeset> {
  const stack = [initialChangedAncestor];
  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();
  while (stack.length > 0) {
    const { threadID, changesByUser } = stack.shift();

    const query = SQL`
      SELECT t.id, m.user, t.type,
        r.permissions AS role_permissions, m.permissions,
        m.permissions_for_children, m.role
      FROM threads t
      LEFT JOIN memberships m ON m.thread = t.id
      LEFT JOIN roles r ON r.id = m.role
      WHERE t.parent_thread_id = ${threadID}
    `;
    const [result] = await dbQuery(query);

    const childThreadInfos = new Map();
    for (const row of result) {
      const childThreadID = row.id.toString();
      if (!childThreadInfos.has(childThreadID)) {
        childThreadInfos.set(childThreadID, {
          threadType: assertThreadType(row.type),
          userInfos: new Map(),
        });
      }
      if (!row.user) {
        continue;
      }
      const childThreadInfo = childThreadInfos.get(childThreadID);
      invariant(childThreadInfo, `value should exist for key ${childThreadID}`);
      const userID = row.user.toString();
      childThreadInfo.userInfos.set(userID, {
        role: row.role.toString(),
        rolePermissions: row.role_permissions,
        permissions: row.permissions,
        permissionsForChildren: row.permissions_for_children,
      });
    }

    for (const [childThreadID, childThreadInfo] of childThreadInfos) {
      const userInfos = childThreadInfo.userInfos;
      const existingMemberIDs = [...userInfos.keys()];
      relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
      const usersForNextLayer = new Map();
      for (const [userID, ancestorChanges] of changesByUser) {
        const { permissionsFromParent } = ancestorChanges;

        const userInfo = userInfos.get(userID);
        const oldRole = userInfo?.role;
        const targetRole = oldRole ?? '0';
        const rolePermissions = userInfo?.rolePermissions;
        const oldPermissions = userInfo?.permissions;
        const oldPermissionsForChildren = userInfo
          ? userInfo.permissionsForChildren
          : null;

        const permissions = makePermissionsBlob(
          rolePermissions,
          permissionsFromParent,
          childThreadID,
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

        const newRole = getRoleForPermissions(targetRole, permissions);
        const userLostMembership =
          oldRole && Number(oldRole) > 0 && Number(newRole) <= 0;

        if (permissions) {
          membershipRows.push({
            operation: 'save',
            intent: 'none',
            userID,
            threadID: childThreadID,
            userNeedsFullThreadDetails: false,
            permissions,
            permissionsForChildren,
            role: newRole,
            oldRole: oldRole ?? '-1',
          });
        } else {
          membershipRows.push({
            operation: 'delete',
            intent: 'none',
            userID,
            threadID: childThreadID,
            oldRole: oldRole ?? '-1',
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

        if (
          userLostMembership ||
          !_isEqual(permissionsForChildren)(oldPermissionsForChildren)
        ) {
          usersForNextLayer.set(userID, {
            permissionsFromParent: permissionsForChildren,
          });
        }
      }
      if (usersForNextLayer.size > 0) {
        stack.push({
          threadID: childThreadID,
          changesByUser: usersForNextLayer,
        });
      }
    }
  }
  return { membershipRows, relationshipChangeset };
}

type RecalculatePermissionsMemberInfo = {|
  role?: ?string,
  permissions?: ?ThreadPermissionsBlob,
  permissionsForChildren?: ?ThreadPermissionsBlob,
  rolePermissions?: ?ThreadRolePermissionsBlob,
  memberOfContainingThread?: boolean,
  permissionsFromParent?: ?ThreadPermissionsBlob,
|};
async function recalculateThreadPermissions(
  threadID: string,
): Promise<Changeset> {
  const threadQuery = SQL`
    SELECT type, containing_thread_id FROM threads WHERE id = ${threadID}
  `;
  const membershipQuery = SQL`
    SELECT m.user, m.role, m.permissions, m.permissions_for_children,
      r.permissions AS role_permissions, cm.role AS containing_role
    FROM threads t
    INNER JOIN memberships m ON m.thread = t.id
    LEFT JOIN roles r ON r.id = m.role
    LEFT JOIN memberships cm
      ON cm.user = m.user AND cm.thread = t.containing_thread_id
    WHERE t.id = ${threadID}
  `;
  const parentMembershipQuery = SQL`
    SELECT pm.user, pm.permissions_for_children AS permissions_from_parent
    FROM threads t
    INNER JOIN memberships pm ON pm.thread = t.parent_thread_id
    WHERE t.id = ${threadID}
  `;
  const [
    [threadResults],
    [membershipResults],
    [parentMembershipResults],
  ] = await Promise.all([
    dbQuery(threadQuery),
    dbQuery(membershipQuery),
    dbQuery(parentMembershipQuery),
  ]);

  if (threadResults.length !== 1) {
    throw new ServerError('internal_error');
  }
  const hasContainingThreadID = threadResults[0].containing_thread_id !== null;
  const threadType = assertThreadType(threadResults[0].type);

  const membershipInfo: Map<
    string,
    RecalculatePermissionsMemberInfo,
  > = new Map();
  for (const row of membershipResults) {
    const userID = row.user.toString();
    membershipInfo.set(userID, {
      role: row.role.toString(),
      permissions: row.permissions,
      permissionsForChildren: row.permissions_for_children,
      rolePermissions: row.role_permissions,
      memberOfContainingThread: !!(
        row.containing_role && row.containing_role > 0
      ),
    });
  }
  for (const row of parentMembershipResults) {
    const userID = row.user.toString();
    const membership = membershipInfo.get(userID);
    if (membership) {
      membership.permissionsFromParent = row.permissions_from_parent;
    } else {
      membershipInfo.set(userID, {
        permissionsFromParent: row.permissions_from_parent,
      });
    }
  }

  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();
  const toUpdateDescendants = new Map();
  const existingMemberIDs = membershipResults.map((row) => row.user.toString());
  relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
  for (const [userID, membership] of membershipInfo) {
    const {
      role: oldRole,
      permissions: oldPermissions,
      permissionsForChildren: oldPermissionsForChildren,
      rolePermissions: intendedRolePermissions,
      permissionsFromParent,
    } = membership;

    const memberOfContainingThread = hasContainingThreadID
      ? !!membership.memberOfContainingThread
      : true;
    const targetRole = memberOfContainingThread && oldRole ? oldRole : '0';
    const rolePermissions = memberOfContainingThread
      ? intendedRolePermissions
      : null;
    const existingMembership = oldRole !== undefined;

    const permissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);
    const newRole = getRoleForPermissions(targetRole, permissions);
    const userLostMembership =
      oldRole && Number(oldRole) > 0 && Number(newRole) <= 0;

    if (_isEqual(permissions)(oldPermissions) && oldRole === newRole) {
      // This thread and all of its descendants need no updates for this user,
      // since the corresponding memberships row is unchanged by this operation
      continue;
    }

    if (permissions) {
      membershipRows.push({
        operation: 'save',
        intent: 'none',
        userID,
        threadID,
        userNeedsFullThreadDetails: false,
        permissions,
        permissionsForChildren,
        role: newRole,
        oldRole: oldRole ?? '-1',
      });
    } else {
      membershipRows.push({
        operation: 'delete',
        intent: 'none',
        userID,
        threadID,
        oldRole: oldRole ?? '-1',
      });
    }

    if (permissions && !existingMembership) {
      // If there was no membership row before, and we are creating one,
      // we'll need to make sure the new member has a relationship row with
      // each existing member. We assume all the new members already have
      // relationship rows with each other, since they must all share the same
      // parent thread.
      relationshipChangeset.setRelationshipsNeeded(userID, existingMemberIDs);
    }

    if (
      userLostMembership ||
      !_isEqual(permissionsForChildren)(oldPermissionsForChildren)
    ) {
      toUpdateDescendants.set(userID, {
        permissionsFromParent: permissionsForChildren,
      });
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipChangeset: descendantRelationshipChangeset,
    } = await updateDescendantPermissions({
      threadID,
      changesByUser: toUpdateDescendants,
    });
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
  const getAllThreads = SQL`SELECT id FROM threads`;
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
    const changeset = await recalculateThreadPermissions(threadID);
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
