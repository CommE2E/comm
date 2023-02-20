// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';

import bots from 'lib/facts/bots.js';
import genesis from 'lib/facts/genesis.js';
import {
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
  getRoleForPermissions,
} from 'lib/permissions/thread-permissions.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import {
  type ThreadPermissionsBlob,
  type ThreadRolePermissionsBlob,
  type ThreadType,
  assertThreadType,
} from 'lib/types/thread-types.js';
import {
  updateTypes,
  type ServerUpdateInfo,
  type CreateUpdatesResult,
} from 'lib/types/update-types.js';
import { pushAll } from 'lib/utils/array.js';
import { ServerError } from 'lib/utils/errors.js';

import { updateChangedUndirectedRelationships } from './relationship-updaters.js';
import {
  createUpdates,
  type UpdatesForCurrentSession,
} from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchServerThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers.js';
import { rescindPushNotifs } from '../push/rescind.js';
import { createScriptViewer } from '../session/scripts.js';
import type { Viewer } from '../session/viewer.js';
import { updateRoles } from '../updaters/role-updaters.js';
import DepthQueue from '../utils/depth-queue.js';
import RelationshipChangeset from '../utils/relationship-changeset.js';

export type MembershipRowToSave = {
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
};
type MembershipRowToDelete = {
  +operation: 'delete',
  +intent: 'join' | 'leave' | 'none',
  +userID: string,
  +threadID: string,
  +oldRole: string,
};
type MembershipRow = MembershipRowToSave | MembershipRowToDelete;
type Changeset = {
  +membershipRows: MembershipRow[],
  +relationshipChangeset: RelationshipChangeset,
};

// 0 role means to remove the user from the thread
// null role means to set the user to the default role
// string role means to set the user to the role with that ID
// -1 role means to set the user as a "ghost" (former member)
type ChangeRoleOptions = {
  +setNewMembersToUnread?: boolean,
};
type ChangeRoleMemberInfo = {
  permissionsFromParent?: ?ThreadPermissionsBlob,
  memberOfContainingThread?: boolean,
};
async function changeRole(
  threadID: string,
  userIDs: $ReadOnlyArray<string>,
  role: string | -1 | 0 | null,
  options?: ChangeRoleOptions,
): Promise<Changeset> {
  const intent = role === -1 || role === 0 ? 'leave' : 'join';
  const setNewMembersToUnread =
    options?.setNewMembersToUnread && intent === 'join';

  if (userIDs.length === 0) {
    return {
      membershipRows: [],
      relationshipChangeset: new RelationshipChangeset(),
    };
  }

  const membershipQuery = SQL`
    SELECT user, role, permissions, permissions_for_children
    FROM memberships
    WHERE thread = ${threadID}
  `;
  const parentMembershipQuery = SQL`
    SELECT pm.user, pm.permissions_for_children AS permissions_from_parent
    FROM threads t
    INNER JOIN memberships pm ON pm.thread = t.parent_thread_id
    WHERE t.id = ${threadID} AND
      (pm.user IN (${userIDs}) OR t.parent_thread_id != ${genesis.id})
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
    parentThreadID,
    hasContainingThreadID,
    rolePermissions: intendedRolePermissions,
    depth,
  } = roleThreadResult;

  const existingMembershipInfo = new Map();
  for (const row of membershipResults) {
    const userID = row.user.toString();
    existingMembershipInfo.set(userID, {
      oldRole: row.role.toString(),
      oldPermissions: JSON.parse(row.permissions),
      oldPermissionsForChildren: JSON.parse(row.permissions_for_children),
    });
  }

  const ancestorMembershipInfo: Map<string, ChangeRoleMemberInfo> = new Map();
  for (const row of parentMembershipResults) {
    const userID = row.user.toString();
    if (!userIDs.includes(userID)) {
      continue;
    }
    ancestorMembershipInfo.set(userID, {
      permissionsFromParent: JSON.parse(row.permissions_from_parent),
    });
  }
  for (const row of containingMembershipResults) {
    const userID = row.user.toString();
    const ancestorMembership = ancestorMembershipInfo.get(userID);
    const memberOfContainingThread = row.containing_role > 0;
    if (ancestorMembership) {
      ancestorMembership.memberOfContainingThread = memberOfContainingThread;
    } else {
      ancestorMembershipInfo.set(userID, {
        memberOfContainingThread,
      });
    }
  }

  const relationshipChangeset = new RelationshipChangeset();
  const existingMemberIDs = [...existingMembershipInfo.keys()];
  if (threadID !== genesis.id) {
    relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
  }
  const parentMemberIDs = parentMembershipResults.map(row =>
    row.user.toString(),
  );
  if (parentThreadID && parentThreadID !== genesis.id) {
    relationshipChangeset.setAllRelationshipsExist(parentMemberIDs);
  }

  const membershipRows = [];
  const toUpdateDescendants = new Map();
  for (const userID of userIDs) {
    const existingMembership = existingMembershipInfo.get(userID);
    const oldRole = existingMembership?.oldRole ?? '-1';
    const oldPermissions = existingMembership?.oldPermissions ?? null;
    const oldPermissionsForChildren =
      existingMembership?.oldPermissionsForChildren ?? null;

    if (existingMembership && oldRole === intendedRole) {
      // If the old role is the same as the new one, we have nothing to update
      continue;
    } else if (Number(oldRole) > 0 && role === null) {
      // In the case where we're just trying to add somebody to a thread, if
      // they already have a role with a nonzero role then we don't need to do
      // anything
      continue;
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
    const targetRole = memberOfContainingThread ? intendedRole : '-1';

    const permissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);
    const newRole = getRoleForPermissions(targetRole, permissions);
    const userBecameMember = Number(oldRole) <= 0 && Number(newRole) > 0;
    const userLostMembership = Number(oldRole) > 0 && Number(newRole) <= 0;

    if (
      (intent === 'join' && Number(newRole) <= 0) ||
      (intent === 'leave' && Number(newRole) > 0)
    ) {
      throw new ServerError('invalid_parameters');
    } else if (intendedRole !== newRole) {
      console.warn(
        `changeRole called for role=${intendedRole}, but ended up setting ` +
          `role=${newRole} for userID ${userID} and threadID ${threadID}, ` +
          'probably because KNOW_OF permission was unexpectedly present or ' +
          'missing',
      );
    }
    if (
      existingMembership &&
      _isEqual(permissions)(oldPermissions) &&
      oldRole === newRole
    ) {
      // This thread and all of its descendants need no updates for this user,
      // since the corresponding memberships row is unchanged by this operation
      continue;
    }

    if (permissions) {
      membershipRows.push({
        operation: 'save',
        intent,
        userID,
        threadID,
        userNeedsFullThreadDetails: userBecameMember,
        permissions,
        permissionsForChildren,
        role: newRole,
        oldRole,
        unread: userBecameMember && setNewMembersToUnread,
      });
    } else {
      membershipRows.push({
        operation: 'delete',
        intent,
        userID,
        threadID,
        oldRole,
      });
    }

    if (permissions && !existingMembership && threadID !== genesis.id) {
      relationshipChangeset.setRelationshipsNeeded(userID, existingMemberIDs);
    }

    if (
      userLostMembership ||
      !_isEqual(permissionsForChildren)(oldPermissionsForChildren)
    ) {
      toUpdateDescendants.set(userID, {
        userIsMember: Number(newRole) > 0,
        permissionsForChildren,
      });
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipChangeset: descendantRelationshipChangeset,
    } = await updateDescendantPermissions({
      threadID,
      depth,
      changesByUser: toUpdateDescendants,
    });
    pushAll(membershipRows, descendantMembershipRows);
    relationshipChangeset.addAll(descendantRelationshipChangeset);
  }

  return { membershipRows, relationshipChangeset };
}

type RoleThreadResult = {
  +roleColumnValue: string,
  +depth: number,
  +threadType: ThreadType,
  +parentThreadID: ?string,
  +hasContainingThreadID: boolean,
  +rolePermissions: ?ThreadRolePermissionsBlob,
};
async function changeRoleThreadQuery(
  threadID: string,
  role: string | -1 | 0 | null,
): Promise<RoleThreadResult> {
  if (role === 0 || role === -1) {
    const query = SQL`
      SELECT type, depth, parent_thread_id, containing_thread_id
      FROM threads
      WHERE id = ${threadID}
    `;
    const [result] = await dbQuery(query);
    if (result.length === 0) {
      throw new ServerError('internal_error');
    }
    const row = result[0];
    return {
      roleColumnValue: role.toString(),
      depth: row.depth,
      threadType: assertThreadType(row.type),
      parentThreadID: row.parent_thread_id
        ? row.parent_thread_id.toString()
        : null,
      hasContainingThreadID: row.containing_thread_id !== null,
      rolePermissions: null,
    };
  } else if (role !== null) {
    const query = SQL`
      SELECT t.type, t.depth, t.parent_thread_id, t.containing_thread_id,
        r.permissions
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
      depth: row.depth,
      threadType: assertThreadType(row.type),
      parentThreadID: row.parent_thread_id
        ? row.parent_thread_id.toString()
        : null,
      hasContainingThreadID: row.containing_thread_id !== null,
      rolePermissions: JSON.parse(row.permissions),
    };
  } else {
    const query = SQL`
      SELECT t.type, t.depth, t.parent_thread_id, t.containing_thread_id,
        t.default_role, r.permissions
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
      depth: row.depth,
      threadType: assertThreadType(row.type),
      parentThreadID: row.parent_thread_id
        ? row.parent_thread_id.toString()
        : null,
      hasContainingThreadID: row.containing_thread_id !== null,
      rolePermissions: JSON.parse(row.permissions),
    };
  }
}

type ChangedAncestor = {
  +threadID: string,
  +depth: number,
  +changesByUser: Map<string, AncestorChanges>,
};
type AncestorChanges = {
  +userIsMember: boolean,
  +permissionsForChildren: ?ThreadPermissionsBlob,
};
async function updateDescendantPermissions(
  initialChangedAncestor: ChangedAncestor,
): Promise<Changeset> {
  const membershipRows = [];
  const relationshipChangeset = new RelationshipChangeset();

  const initialDescendants = await fetchDescendantsForUpdate([
    initialChangedAncestor,
  ]);

  const depthQueue = new DepthQueue(
    getDescendantDepth,
    getDescendantKey,
    mergeDescendants,
  );
  depthQueue.addInfos(initialDescendants);

  let descendants;
  while ((descendants = depthQueue.getNextDepth())) {
    const descendantsAsAncestors = [];
    for (const descendant of descendants) {
      const { threadID, threadType, depth, users } = descendant;

      const existingMembers = [...users.entries()];
      const existingMemberIDs = existingMembers
        .filter(([, { curRole }]) => curRole)
        .map(([userID]) => userID);
      if (threadID !== genesis.id) {
        relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
      }

      const usersForNextLayer = new Map();
      for (const [userID, user] of users) {
        const {
          curRolePermissions,
          curPermissionsFromParent,
          curMemberOfContainingThread,
          nextMemberOfContainingThread,
          nextPermissionsFromParent,
          potentiallyNeedsUpdate,
        } = user;
        const existingMembership = !!user.curRole;
        const curRole = user.curRole ?? '-1';
        const curPermissions = user.curPermissions ?? null;
        const curPermissionsForChildren =
          user.curPermissionsForChildren ?? null;

        if (!potentiallyNeedsUpdate) {
          continue;
        }

        const permissionsFromParent =
          nextPermissionsFromParent === undefined
            ? curPermissionsFromParent
            : nextPermissionsFromParent;
        const memberOfContainingThread =
          nextMemberOfContainingThread === undefined
            ? curMemberOfContainingThread
            : nextMemberOfContainingThread;
        const targetRole = memberOfContainingThread ? curRole : '-1';
        const rolePermissions = memberOfContainingThread
          ? curRolePermissions
          : null;

        const permissions = makePermissionsBlob(
          rolePermissions,
          permissionsFromParent,
          threadID,
          threadType,
        );
        const permissionsForChildren =
          makePermissionsForChildrenBlob(permissions);
        const newRole = getRoleForPermissions(targetRole, permissions);
        const userLostMembership = Number(curRole) > 0 && Number(newRole) <= 0;

        if (_isEqual(permissions)(curPermissions) && curRole === newRole) {
          // This thread and all of its descendants need no updates for this
          // user, since the corresponding memberships row is unchanged by this
          // operation
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
            oldRole: curRole,
          });
        } else {
          membershipRows.push({
            operation: 'delete',
            intent: 'none',
            userID,
            threadID,
            oldRole: curRole,
          });
        }

        if (permissions && !existingMembership && threadID !== genesis.id) {
          // If there was no membership row before, and we are creating one,
          // we'll need to make sure the new member has a relationship row with
          // each existing member. We expect that whoever called us already
          // generated memberships row for the new members, will will lead
          // saveMemberships to generate relationships rows between those new
          // users.
          relationshipChangeset.setRelationshipsNeeded(
            userID,
            existingMemberIDs,
          );
        }

        if (
          userLostMembership ||
          !_isEqual(permissionsForChildren)(curPermissionsForChildren)
        ) {
          usersForNextLayer.set(userID, {
            userIsMember: Number(newRole) > 0,
            permissionsForChildren,
          });
        }
      }
      if (usersForNextLayer.size > 0) {
        descendantsAsAncestors.push({
          threadID,
          depth,
          changesByUser: usersForNextLayer,
        });
      }
    }

    const nextDescendants = await fetchDescendantsForUpdate(
      descendantsAsAncestors,
    );
    depthQueue.addInfos(nextDescendants);
  }
  return { membershipRows, relationshipChangeset };
}

type DescendantUserInfo = $Shape<{
  curRole?: string,
  curRolePermissions?: ?ThreadRolePermissionsBlob,
  curPermissions?: ?ThreadPermissionsBlob,
  curPermissionsForChildren?: ?ThreadPermissionsBlob,
  curPermissionsFromParent?: ?ThreadPermissionsBlob,
  curMemberOfContainingThread?: boolean,
  nextPermissionsFromParent?: ?ThreadPermissionsBlob,
  nextMemberOfContainingThread?: boolean,
  potentiallyNeedsUpdate?: boolean,
}>;
type DescendantInfo = {
  +threadID: string,
  +parentThreadID: string,
  +containingThreadID: string,
  +threadType: ThreadType,
  +depth: number,
  +users: Map<string, DescendantUserInfo>,
};
const fetchDescendantsBatchSize = 10;
async function fetchDescendantsForUpdate(
  ancestors: $ReadOnlyArray<ChangedAncestor>,
): Promise<DescendantInfo[]> {
  const threadIDs = ancestors.map(ancestor => ancestor.threadID);

  const rows = [];
  while (threadIDs.length > 0) {
    const batch = threadIDs.splice(0, fetchDescendantsBatchSize);
    const query = SQL`
      SELECT t.id, m.user, t.type, t.depth, t.parent_thread_id,
        t.containing_thread_id, r.permissions AS role_permissions, m.permissions,
        m.permissions_for_children, m.role,
        pm.permissions_for_children AS permissions_from_parent,
        cm.role AS containing_role
      FROM threads t
      INNER JOIN memberships m ON m.thread = t.id
      LEFT JOIN memberships pm
        ON pm.thread = t.parent_thread_id AND pm.user = m.user
      LEFT JOIN memberships cm
        ON cm.thread = t.containing_thread_id AND cm.user = m.user
      LEFT JOIN roles r ON r.id = m.role
      WHERE t.parent_thread_id IN (${batch})
        OR t.containing_thread_id IN (${batch})
    `;
    const [results] = await dbQuery(query);
    pushAll(rows, results);
  }

  const descendantThreadInfos: Map<string, DescendantInfo> = new Map();
  for (const row of rows) {
    const descendantThreadID = row.id.toString();
    if (!descendantThreadInfos.has(descendantThreadID)) {
      descendantThreadInfos.set(descendantThreadID, {
        threadID: descendantThreadID,
        parentThreadID: row.parent_thread_id.toString(),
        containingThreadID: row.containing_thread_id.toString(),
        threadType: assertThreadType(row.type),
        depth: row.depth,
        users: new Map(),
      });
    }
    const descendantThreadInfo = descendantThreadInfos.get(descendantThreadID);
    invariant(
      descendantThreadInfo,
      `value should exist for key ${descendantThreadID}`,
    );
    const userID = row.user.toString();
    descendantThreadInfo.users.set(userID, {
      curRole: row.role.toString(),
      curRolePermissions: JSON.parse(row.role_permissions),
      curPermissions: JSON.parse(row.permissions),
      curPermissionsForChildren: JSON.parse(row.permissions_for_children),
      curPermissionsFromParent: JSON.parse(row.permissions_from_parent),
      curMemberOfContainingThread: row.containing_role > 0,
    });
  }

  for (const ancestor of ancestors) {
    const { threadID, changesByUser } = ancestor;
    for (const [userID, changes] of changesByUser) {
      for (const descendantThreadInfo of descendantThreadInfos.values()) {
        const { users, parentThreadID, containingThreadID } =
          descendantThreadInfo;
        if (threadID !== parentThreadID && threadID !== containingThreadID) {
          continue;
        }
        let user = users.get(userID);
        if (!user) {
          user = {};
          users.set(userID, user);
        }
        if (threadID === parentThreadID) {
          user.nextPermissionsFromParent = changes.permissionsForChildren;
          user.potentiallyNeedsUpdate = true;
        }
        if (threadID === containingThreadID) {
          user.nextMemberOfContainingThread = changes.userIsMember;
          if (!user.nextMemberOfContainingThread) {
            user.potentiallyNeedsUpdate = true;
          }
        }
      }
    }
  }

  return [...descendantThreadInfos.values()];
}

function getDescendantDepth(descendant: DescendantInfo): number {
  return descendant.depth;
}
function getDescendantKey(descendant: DescendantInfo): string {
  return descendant.threadID;
}
function mergeDescendants(
  a: DescendantInfo,
  b: DescendantInfo,
): DescendantInfo {
  const { users: usersA, ...restA } = a;
  const { users: usersB, ...restB } = b;
  if (!_isEqual(restA)(restB)) {
    console.warn(
      `inconsistent descendantInfos ${JSON.stringify(restA)}, ` +
        JSON.stringify(restB),
    );
    throw new ServerError('internal_error');
  }

  const newUsers = new Map(usersA);
  for (const [userID, userFromB] of usersB) {
    const userFromA = newUsers.get(userID);
    if (!userFromA) {
      newUsers.set(userID, userFromB);
    } else {
      newUsers.set(userID, { ...userFromA, ...userFromB });
    }
  }

  return { ...a, users: newUsers };
}

type RecalculatePermissionsMemberInfo = {
  role?: ?string,
  permissions?: ?ThreadPermissionsBlob,
  permissionsForChildren?: ?ThreadPermissionsBlob,
  rolePermissions?: ?ThreadRolePermissionsBlob,
  memberOfContainingThread?: boolean,
  permissionsFromParent?: ?ThreadPermissionsBlob,
};
async function recalculateThreadPermissions(
  threadID: string,
): Promise<Changeset> {
  const threadQuery = SQL`
    SELECT type, depth, parent_thread_id, containing_thread_id
    FROM threads
    WHERE id = ${threadID}
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
  const [[threadResults], [membershipResults], [parentMembershipResults]] =
    await Promise.all([
      dbQuery(threadQuery),
      dbQuery(membershipQuery),
      dbQuery(parentMembershipQuery),
    ]);

  if (threadResults.length !== 1) {
    throw new ServerError('internal_error');
  }
  const [threadResult] = threadResults;
  const threadType = assertThreadType(threadResult.type);
  const depth = threadResult.depth;
  const hasContainingThreadID = threadResult.containing_thread_id !== null;
  const parentThreadID = threadResult.parent_thread_id?.toString();

  const membershipInfo: Map<string, RecalculatePermissionsMemberInfo> =
    new Map();
  for (const row of membershipResults) {
    const userID = row.user.toString();
    membershipInfo.set(userID, {
      role: row.role.toString(),
      permissions: JSON.parse(row.permissions),
      permissionsForChildren: JSON.parse(row.permissions_for_children),
      rolePermissions: JSON.parse(row.role_permissions),
      memberOfContainingThread: !!(
        row.containing_role && row.containing_role > 0
      ),
    });
  }
  for (const row of parentMembershipResults) {
    const userID = row.user.toString();
    const permissionsFromParent = JSON.parse(row.permissions_from_parent);
    const membership = membershipInfo.get(userID);
    if (membership) {
      membership.permissionsFromParent = permissionsFromParent;
    } else {
      membershipInfo.set(userID, {
        permissionsFromParent: permissionsFromParent,
      });
    }
  }

  const relationshipChangeset = new RelationshipChangeset();
  const existingMemberIDs = membershipResults.map(row => row.user.toString());
  if (threadID !== genesis.id) {
    relationshipChangeset.setAllRelationshipsExist(existingMemberIDs);
  }
  const parentMemberIDs = parentMembershipResults.map(row =>
    row.user.toString(),
  );
  if (parentThreadID && parentThreadID !== genesis.id) {
    relationshipChangeset.setAllRelationshipsExist(parentMemberIDs);
  }

  const membershipRows = [];
  const toUpdateDescendants = new Map();
  for (const [userID, membership] of membershipInfo) {
    const { rolePermissions: intendedRolePermissions, permissionsFromParent } =
      membership;
    const oldPermissions = membership?.permissions ?? null;
    const oldPermissionsForChildren =
      membership?.permissionsForChildren ?? null;

    const existingMembership = membership.role !== undefined;
    const oldRole = membership.role ?? '-1';
    const memberOfContainingThread = hasContainingThreadID
      ? !!membership.memberOfContainingThread
      : true;
    const targetRole = memberOfContainingThread ? oldRole : '-1';
    const rolePermissions = memberOfContainingThread
      ? intendedRolePermissions
      : null;

    const permissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      threadType,
    );
    const permissionsForChildren = makePermissionsForChildrenBlob(permissions);
    const newRole = getRoleForPermissions(targetRole, permissions);
    const userLostMembership = Number(oldRole) > 0 && Number(newRole) <= 0;

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
        oldRole,
      });
    } else {
      membershipRows.push({
        operation: 'delete',
        intent: 'none',
        userID,
        threadID,
        oldRole,
      });
    }

    if (permissions && !existingMembership && threadID !== genesis.id) {
      // If there was no membership row before, and we are creating one,
      // we'll need to make sure the new member has a relationship row with
      // each existing member. We handle guaranteeing that new members have
      // relationship rows with each other in saveMemberships.
      relationshipChangeset.setRelationshipsNeeded(userID, existingMemberIDs);
    }

    if (
      userLostMembership ||
      !_isEqual(permissionsForChildren)(oldPermissionsForChildren)
    ) {
      toUpdateDescendants.set(userID, {
        userIsMember: Number(newRole) > 0,
        permissionsForChildren,
      });
    }
  }

  if (toUpdateDescendants.size > 0) {
    const {
      membershipRows: descendantMembershipRows,
      relationshipChangeset: descendantRelationshipChangeset,
    } = await updateDescendantPermissions({
      threadID,
      depth,
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
          (role <= 0 AND VALUE(role) > 0)
            OR (role > 0 AND VALUE(role) <= 0),
          VALUE(subscription),
          subscription
        ),
        role = VALUE(role),
        permissions = VALUE(permissions),
        permissions_for_children = VALUE(permissions_for_children)
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
  const insertRows = toDelete.map(rowToDelete => [
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

const emptyCommitMembershipChangesetConfig = Object.freeze({});

// Specify non-empty changedThreadIDs to force updates to be generated for those
// threads, presumably for reasons not covered in the changeset. calendarQuery
// only needs to be specified if a JOIN_THREAD update will be generated for the
// viewer, in which case it's necessary for knowing the set of entries to fetch.
type ChangesetCommitResult = {
  ...FetchThreadInfosResult,
  ...CreateUpdatesResult,
};
async function commitMembershipChangeset(
  viewer: Viewer,
  changeset: Changeset,
  {
    changedThreadIDs = new Set(),
    calendarQuery,
    updatesForCurrentSession = 'return',
  }: {
    +changedThreadIDs?: Set<string>,
    +calendarQuery?: ?CalendarQuery,
    +updatesForCurrentSession?: UpdatesForCurrentSession,
  } = emptyCommitMembershipChangesetConfig,
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
  for (const [threadID, savedUsers] of threadsToSavedUsers) {
    if (threadID !== genesis.id) {
      relationshipChangeset.setAllRelationshipsNeeded(savedUsers);
    }
  }
  const relationshipRows = relationshipChangeset.getRows();

  const [updateDatas] = await Promise.all([
    updateChangedUndirectedRelationships(relationshipRows),
    saveMemberships(toSave),
    deleteMemberships(toDelete),
    rescindPushNotifsForMemberDeletion(toRescindPushNotifs),
  ]);

  // We fetch all threads here because old clients still expect the full list of
  // threads on most thread operations. Once verifyClientSupported gates on
  // codeVersion 62, we can add a WHERE clause on changedThreadIDs here
  const serverThreadInfoFetchResult = await fetchServerThreadInfos();
  const { threadInfos: serverThreadInfos } = serverThreadInfoFetchResult;

  const time = Date.now();
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

const emptyGetChangesetCommitResultConfig = Object.freeze({});

// When the user tries to create a new thread, it's possible for the client to
// fail the creation even if a row gets added to the threads table. This may
// occur due to a timeout (on either the client or server side), or due to some
// error in the server code following the INSERT operation. Handling the error
// scenario is more challenging since it would require detecting which set of
// operations failed so we could retry them. As a result, this code is geared at
// only handling the timeout scenario.
async function getChangesetCommitResultForExistingThread(
  viewer: Viewer,
  threadID: string,
  otherUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  {
    calendarQuery,
    updatesForCurrentSession = 'return',
  }: {
    +calendarQuery?: ?CalendarQuery,
    +updatesForCurrentSession?: UpdatesForCurrentSession,
  } = emptyGetChangesetCommitResultConfig,
): Promise<CreateUpdatesResult> {
  for (const update of otherUpdates) {
    if (
      update.type === updateTypes.JOIN_THREAD &&
      update.threadInfo.id === threadID
    ) {
      // If the JOIN_THREAD is already there we can expect
      // the appropriate UPDATE_USERs to be covered as well
      return { viewerUpdates: otherUpdates, userInfos: {} };
    }
  }

  const time = Date.now();
  const updateDatas = [
    {
      type: updateTypes.JOIN_THREAD,
      userID: viewer.userID,
      time,
      threadID,
      targetSession: viewer.session,
    },
  ];

  // To figure out what UserInfos might be missing, we consider the worst case:
  // the same client previously attempted to create a thread with a non-friend
  // they found via search results, but the request timed out. In this scenario
  // the viewer might never have received the UPDATE_USER that would add that
  // UserInfo to their UserStore, but the server assumed the client had gotten
  // it because createUpdates was called with UpdatesForCurrentSession=return.
  // For completeness here we query for the full list of memberships rows in the
  // thread. We can't use fetchServerThreadInfos because it skips role=-1 rows
  const membershipsQuery = SQL`
    SELECT user
    FROM memberships
    WHERE thread = ${threadID} AND user != ${viewer.userID}
  `;
  const [results] = await dbQuery(membershipsQuery);
  for (const row of results) {
    updateDatas.push({
      type: updateTypes.UPDATE_USER,
      userID: viewer.userID,
      time,
      updatedUserID: row.user.toString(),
      targetSession: viewer.session,
    });
  }

  const { viewerUpdates, userInfos } = await createUpdates(updateDatas, {
    viewer,
    calendarQuery,
    updatesForCurrentSession,
  });
  return { viewerUpdates: [...otherUpdates, ...viewerUpdates], userInfos };
}

const rescindPushNotifsBatchSize = 3;
async function rescindPushNotifsForMemberDeletion(
  toRescindPushNotifs: $ReadOnlyArray<{ +userID: string, +threadID: string }>,
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
  const viewer = createScriptViewer(bots.commbot.userID);
  for (const row of result) {
    const threadID = row.id.toString();
    const changeset = await recalculateThreadPermissions(threadID);
    await commitMembershipChangeset(viewer, changeset);
  }
}

async function updateRolesAndPermissionsForAllThreads() {
  const batchSize = 10;
  const fetchThreads = SQL`SELECT id, type, depth FROM threads`;
  const [result] = await dbQuery(fetchThreads);
  const allThreads = result.map(row => {
    return {
      id: row.id.toString(),
      type: assertThreadType(row.type),
      depth: row.depth,
    };
  });

  const viewer = createScriptViewer(bots.commbot.userID);

  const maxDepth = Math.max(...allThreads.map(row => row.depth));

  for (let depth = 0; depth <= maxDepth; depth++) {
    const threads = allThreads.filter(row => row.depth === depth);
    console.log(`recalculating permissions for threads with depth ${depth}`);
    while (threads.length > 0) {
      const batch = threads.splice(0, batchSize);
      const membershipRows = [];
      const relationshipChangeset = new RelationshipChangeset();
      await Promise.all(
        batch.map(async thread => {
          console.log(`updating roles for ${thread.id}`);
          await updateRoles(viewer, thread.id, thread.type);
          console.log(`recalculating permissions for ${thread.id}`);
          const {
            membershipRows: threadMembershipRows,
            relationshipChangeset: threadRelationshipChangeset,
          } = await recalculateThreadPermissions(thread.id);
          membershipRows.push(...threadMembershipRows);
          relationshipChangeset.addAll(threadRelationshipChangeset);
        }),
      );
      console.log(`committing batch ${JSON.stringify(batch)}`);
      await commitMembershipChangeset(viewer, {
        membershipRows,
        relationshipChangeset,
      });
    }
  }
}

export {
  changeRole,
  recalculateThreadPermissions,
  getChangesetCommitResultForExistingThread,
  saveMemberships,
  commitMembershipChangeset,
  recalculateAllThreadPermissions,
  updateRolesAndPermissionsForAllThreads,
};
