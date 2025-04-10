// @flow

import _keyBy from 'lodash/fp/keyBy.js';
import _mapValues from 'lodash/fp/mapValues.js';

import genesis from 'lib/facts/genesis.js';
import {
  permissionLookup,
  makePermissionsBlob,
  getRoleForPermissions,
} from 'lib/permissions/thread-permissions.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import {
  permissionsDisabledByBlock,
  threadIsWithBlockedUserOnlyWithoutAdminRoleCheck,
  threadMembersWithoutAddedAdmin,
  roleIsAdminRole,
} from 'lib/shared/thread-utils.js';
import type {
  MemberInfoWithPermissions,
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type {
  ThreadPermission,
  ThreadPermissionsBlob,
  ThreadRolePermissionsBlob,
} from 'lib/types/thread-permission-types.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import { fetchThreadInfos } from './thread-fetchers.js';
import { fetchKnownUserInfos } from './user-fetchers.js';
import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

// Note that it's risky to verify permissions by inspecting the blob directly.
// There are other factors that can override permissions in the permissions
// blob, such as when one user blocks another. It's always better to go through
// checkThreads and friends, or by looking at the ThreadInfo through
// threadHasPermission.
async function fetchThreadPermissionsBlob(
  viewer: Viewer,
  threadID: string,
): Promise<?ThreadPermissionsBlob> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT permissions
    FROM memberships
    WHERE thread = ${threadID} AND user = ${viewerID}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    return null;
  }
  const row = result[0];
  return JSON.parse(row.permissions);
}

function checkThreadPermission(
  viewer: Viewer,
  threadID: string,
  permission: ThreadPermission,
): Promise<boolean> {
  return checkThread(viewer, threadID, [{ check: 'permission', permission }]);
}

function viewerIsMember(viewer: Viewer, threadID: string): Promise<boolean> {
  return checkThread(viewer, threadID, [{ check: 'is_member' }]);
}

async function viewerIsMemberOfThreads(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
): Promise<Map<string, boolean>> {
  const validThreadIDs = await checkThreads(viewer, threadIDs, [
    { check: 'is_member' },
  ]);

  return new Map(
    threadIDs.map(threadID => [threadID, validThreadIDs.has(threadID)]),
  );
}

async function viewerHasPositiveRole(
  viewer: Viewer,
  threadID: string,
): Promise<boolean> {
  const query = SQL`
    SELECT role
    FROM memberships
    WHERE thread = ${threadID} AND user = ${viewer.userID}
  `;

  const [queryResult] = await dbQuery(query);
  const positiveRoles = queryResult.filter(row => Number(row.role) > 0);
  return positiveRoles.length > 0;
}

type Check =
  | { +check: 'is_member' }
  | { +check: 'permission', +permission: ThreadPermission };

function isThreadValid(
  permissions: ?ThreadPermissionsBlob,
  role: number,
  checks: $ReadOnlyArray<Check>,
  predicate: 'and' | 'or' = 'and',
): boolean {
  if (predicate === 'or') {
    for (const check of checks) {
      if (check.check === 'is_member') {
        if (role > 0) {
          return true;
        }
      } else if (check.check === 'permission') {
        if (permissionLookup(permissions, check.permission)) {
          return true;
        }
      }
    }
    return false;
  }
  for (const check of checks) {
    if (check.check === 'is_member') {
      if (role <= 0) {
        return false;
      }
    } else if (check.check === 'permission') {
      if (!permissionLookup(permissions, check.permission)) {
        return false;
      }
    }
  }
  return true;
}

async function checkThreads(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
  checks: $ReadOnlyArray<Check>,
): Promise<Set<string>> {
  if (viewer.isScriptViewer) {
    // script viewers are all-powerful
    return new Set(threadIDs);
  }

  const threadRows = await getValidThreads(viewer, threadIDs, checks);
  return new Set(threadRows.map(row => row.threadID));
}

// Like checkThread, but "or" over the checks instead of "and"
async function checkThreadsOr(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
  checks: $ReadOnlyArray<Check>,
): Promise<Set<string>> {
  if (viewer.isScriptViewer) {
    // script viewers are all-powerful
    return new Set(threadIDs);
  }

  const threadRows = await getValidThreads(viewer, threadIDs, checks, 'or');
  return new Set(threadRows.map(row => row.threadID));
}

type PartialMembershipRow = {
  +threadID: string,
  +role: number,
  +permissions: ThreadPermissionsBlob,
};
async function getValidThreads(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
  checks: $ReadOnlyArray<Check>,
  predicate: 'and' | 'or' = 'and',
): Promise<PartialMembershipRow[]> {
  if (
    predicate === 'or' &&
    checks.some(({ check }) => check !== 'permission')
  ) {
    // Handling non-permission checks for the "or" case is more complicated.
    // We'd need to break the separation between isThreadValid and
    // checkThreadsFrozen, since a a valid non-permission check in isThreadValid
    // should cause checkThreadsFrozen to be ignored.
    throw new ServerError(
      'getValidThreads only supports the "or" predicate when provided only ' +
        'permission checks',
    );
  }

  const query = SQL`
    SELECT thread AS threadID, permissions, role
    FROM memberships
    WHERE thread IN (${threadIDs}) AND user = ${viewer.userID}
  `;

  const permissionsToCheck = [];
  for (const check of checks) {
    if (check.check === 'permission') {
      permissionsToCheck.push(check.permission);
    }
  }

  const [[result], disabledThreadIDs] = await Promise.all([
    dbQuery(query),
    checkThreadsFrozen(viewer, permissionsToCheck, threadIDs, predicate),
  ]);

  return result
    .map(row => ({
      ...row,
      threadID: row.threadID.toString(),
      permissions: JSON.parse(row.permissions),
    }))
    .filter(
      row =>
        isThreadValid(row.permissions, row.role, checks, predicate) &&
        !disabledThreadIDs.has(row.threadID),
    );
}

async function checkThreadsFrozen(
  viewer: Viewer,
  permissionsToCheck: $ReadOnlyArray<ThreadPermission>,
  threadIDs: $ReadOnlyArray<string>,
  predicate: 'and' | 'or' = 'and',
): Promise<$ReadOnlySet<string>> {
  const threadIDsWithDisabledPermissions = new Set<string>();

  let permissionMightBeDisabled;
  if (predicate === 'and') {
    permissionMightBeDisabled = permissionsToCheck.some(permission =>
      permissionsDisabledByBlock.has(permission),
    );
  } else {
    permissionMightBeDisabled = permissionsToCheck.every(permission =>
      permissionsDisabledByBlock.has(permission),
    );
  }
  if (!permissionMightBeDisabled) {
    return threadIDsWithDisabledPermissions;
  }

  const [{ threadInfos }, userInfos] = await Promise.all([
    fetchThreadInfos(viewer, { threadIDs: new Set(threadIDs) }),
    fetchKnownUserInfos(viewer),
  ]);

  const communityThreadIDs = new Set<string>();
  for (const threadInfo of values(threadInfos)) {
    const communityRootThreadID = threadInfo.community;
    if (!communityRootThreadID) {
      continue;
    }
    communityThreadIDs.add(communityRootThreadID);
  }

  const { threadInfos: communityThreadInfos } = await fetchThreadInfos(viewer, {
    threadIDs: communityThreadIDs,
  });

  const combinedThreadInfos = {
    ...threadInfos,
    ...communityThreadInfos,
  };

  const communityRootMembersToRole = _mapValues((threadInfo: ThreadInfo) => {
    const keyedMembers = _keyBy('id')(threadInfo.members);
    const keyedMembersToRole = _mapValues(
      (member: MemberInfoWithPermissions | RelativeMemberInfo) => {
        return member.role ? threadInfo.roles[member.role] : null;
      },
    )(keyedMembers);
    return keyedMembersToRole;
  })(combinedThreadInfos);

  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];

    if (
      threadInfo.community &&
      !(threadInfo.community in communityRootMembersToRole)
    ) {
      threadIDsWithDisabledPermissions.add(threadID);
      continue;
    }

    // We fall back to threadID because the only case where threadInfo.community
    // is not set is for a community root, in which case the thread's community
    // root is the thread itself.
    const communityMembersToRole =
      communityRootMembersToRole[threadInfo.community ?? threadID];

    const memberHasAdminRole = threadMembersWithoutAddedAdmin(threadInfo).some(
      m => roleIsAdminRole(communityMembersToRole?.[m.id]),
    );

    if (memberHasAdminRole) {
      continue;
    }

    const blockedThread = threadIsWithBlockedUserOnlyWithoutAdminRoleCheck(
      threadInfo,
      viewer.id,
      userInfos,
      false,
    );

    if (blockedThread) {
      threadIDsWithDisabledPermissions.add(threadID);
    }
  }

  return threadIDsWithDisabledPermissions;
}

async function checkIfThreadIsBlocked(
  viewer: Viewer,
  threadID: string,
  permission: ThreadPermission,
): Promise<boolean> {
  const disabledThreadIDs = await checkThreadsFrozen(
    viewer,
    [permission],
    [threadID],
  );

  return disabledThreadIDs.has(threadID);
}

async function checkThread(
  viewer: Viewer,
  threadID: string,
  checks: $ReadOnlyArray<Check>,
): Promise<boolean> {
  const validThreads = await checkThreads(viewer, [threadID], checks);
  return validThreads.has(threadID);
}

// We pass this into getRoleForPermissions in order to check if a hypothetical
// permissions blob would block membership by returning a non-positive result.
// It doesn't matter what value we pass in, as long as it's positive.
const arbitraryPositiveRole = '1';

type ContainingStatus = 'member' | 'non-member' | 'no-containing-thread';

type CandidateMembers = {
  +[key: string]: ?$ReadOnlyArray<string>,
};
type ValidateCandidateMembersParams = {
  +threadType: ThreadType,
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +defaultRolePermissions: ThreadRolePermissionsBlob,
  +communityID: ?string,
};
type ValidateCandidateMembersOptions = { +requireRelationship?: boolean };
async function validateCandidateMembers(
  viewer: Viewer,
  candidates: CandidateMembers,
  params: ValidateCandidateMembersParams,
  options?: ValidateCandidateMembersOptions,
): Promise<CandidateMembers> {
  const requireRelationship = options?.requireRelationship ?? true;

  const allCandidatesSet = new Set<string>();
  for (const key in candidates) {
    const candidateGroup = candidates[key];
    if (!candidateGroup) {
      continue;
    }
    for (const candidate of candidateGroup) {
      allCandidatesSet.add(candidate);
    }
  }
  const allCandidates = [...allCandidatesSet];

  const fetchMembersPromise = fetchKnownUserInfos(viewer, allCandidates);

  const parentPermissionsPromise = (async () => {
    const parentPermissions = {};
    if (!params.parentThreadID || allCandidates.length === 0) {
      return parentPermissions;
    }
    const parentPermissionsQuery = SQL`
      SELECT user, permissions
      FROM memberships
      WHERE thread = ${params.parentThreadID} AND user IN (${allCandidates})
    `;
    const [result] = await dbQuery(parentPermissionsQuery);
    for (const row of result) {
      parentPermissions[row.user.toString()] = JSON.parse(row.permissions);
    }
    return parentPermissions;
  })();

  const memberOfContainingThreadPromise: Promise<
    Map<string, ContainingStatus>,
  > = (async () => {
    const results = new Map<string, ContainingStatus>();
    if (allCandidates.length === 0) {
      return results;
    }
    if (!params.containingThreadID) {
      for (const userID of allCandidates) {
        results.set(userID, 'no-containing-thread');
      }
      return results;
    }
    for (const userID of allCandidates) {
      results.set(userID, 'non-member');
    }
    const memberOfContainingThreadQuery = SQL`
      SELECT user, role AS containing_role
      FROM memberships
      WHERE thread = ${params.containingThreadID} AND user IN (${allCandidates})
    `;
    const [result] = await dbQuery(memberOfContainingThreadQuery);
    for (const row of result) {
      results.set(
        row.user.toString(),
        row.containing_role > 0 ? 'member' : 'non-member',
      );
    }
    return results;
  })();

  const [fetchedMembers, parentPermissions, memberOfContainingThread] =
    await Promise.all([
      fetchMembersPromise,
      parentPermissionsPromise,
      memberOfContainingThreadPromise,
    ]);

  const ignoreMembers = new Set<string>();
  for (const memberID of allCandidates) {
    const member = fetchedMembers[memberID];
    if (!member && requireRelationship) {
      ignoreMembers.add(memberID);
      continue;
    }
    const relationshipStatus = member?.relationshipStatus;
    const memberRelationshipHasBlock = !!(
      relationshipStatus &&
      relationshipBlockedInEitherDirection(relationshipStatus)
    );
    if (memberRelationshipHasBlock) {
      ignoreMembers.add(memberID);
      continue;
    }
    const permissionsFromParent = parentPermissions[memberID];
    if (
      memberOfContainingThread.get(memberID) === 'non-member' &&
      (params.communityID !== genesis().id ||
        (relationshipStatus !== userRelationshipStatus.FRIEND &&
          requireRelationship))
    ) {
      ignoreMembers.add(memberID);
      continue;
    }
    if (
      memberOfContainingThread.get(memberID) === 'no-containing-thread' &&
      relationshipStatus !== userRelationshipStatus.FRIEND &&
      requireRelationship
    ) {
      ignoreMembers.add(memberID);
      continue;
    }
    const permissions = makePermissionsBlob(
      params.defaultRolePermissions,
      permissionsFromParent,
      '-1',
      params.threadType,
    );
    if (!permissions) {
      ignoreMembers.add(memberID);
      continue;
    }
    const targetRole = getRoleForPermissions(
      arbitraryPositiveRole,
      permissions,
    );
    if (Number(targetRole) <= 0) {
      ignoreMembers.add(memberID);
      continue;
    }
  }
  if (ignoreMembers.size === 0) {
    return candidates;
  }

  const result: { [string]: ?$ReadOnlyArray<string> } = {};
  for (const key in candidates) {
    const candidateGroup = candidates[key];
    if (!candidateGroup) {
      result[key] = candidateGroup;
      continue;
    }
    const resultForKey = [];
    for (const candidate of candidateGroup) {
      if (!ignoreMembers.has(candidate)) {
        resultForKey.push(candidate);
      }
    }
    result[key] = resultForKey;
  }
  return result;
}

export {
  fetchThreadPermissionsBlob,
  checkThreadPermission,
  viewerIsMember,
  viewerIsMemberOfThreads,
  checkThreads,
  checkThreadsOr,
  getValidThreads,
  checkThread,
  checkIfThreadIsBlocked,
  validateCandidateMembers,
  viewerHasPositiveRole,
};
