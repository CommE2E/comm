// @flow

import genesis from 'lib/facts/genesis.js';
import {
  permissionLookup,
  makePermissionsBlob,
  getRoleForPermissions,
} from 'lib/permissions/thread-permissions.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import {
  threadFrozenDueToBlock,
  permissionsDisabledByBlock,
} from 'lib/shared/thread-utils.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type {
  ThreadType,
  ThreadPermission,
  ThreadPermissionsBlob,
  ThreadRolePermissionsBlob,
} from 'lib/types/thread-types.js';

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

type Check =
  | { +check: 'is_member' }
  | { +check: 'permission', +permission: ThreadPermission };

function isThreadValid(
  permissions: ?ThreadPermissionsBlob,
  role: number,
  checks: $ReadOnlyArray<Check>,
): boolean {
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

type PartialMembershipRow = {
  +threadID: string,
  +role: number,
  +permissions: ThreadPermissionsBlob,
};
async function getValidThreads(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
  checks: $ReadOnlyArray<Check>,
): Promise<PartialMembershipRow[]> {
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
    checkThreadsFrozen(viewer, permissionsToCheck, threadIDs),
  ]);

  return result
    .map(row => ({
      ...row,
      threadID: row.threadID.toString(),
      permissions: JSON.parse(row.permissions),
    }))
    .filter(
      row =>
        isThreadValid(row.permissions, row.role, checks) &&
        !disabledThreadIDs.has(row.threadID),
    );
}

async function checkThreadsFrozen(
  viewer: Viewer,
  permissionsToCheck: $ReadOnlyArray<ThreadPermission>,
  threadIDs: $ReadOnlyArray<string>,
) {
  const threadIDsWithDisabledPermissions = new Set();

  const permissionMightBeDisabled = permissionsToCheck.some(permission =>
    permissionsDisabledByBlock.has(permission),
  );
  if (!permissionMightBeDisabled) {
    return threadIDsWithDisabledPermissions;
  }

  const [{ threadInfos }, userInfos] = await Promise.all([
    fetchThreadInfos(viewer, SQL`t.id IN (${[...threadIDs]})`),
    fetchKnownUserInfos(viewer),
  ]);

  for (const threadID in threadInfos) {
    const blockedThread = threadFrozenDueToBlock(
      threadInfos[threadID],
      viewer.id,
      userInfos,
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

type CandidateMembers = {
  +[key: string]: ?$ReadOnlyArray<string>,
  ...
};
type ValidateCandidateMembersParams = {
  +threadType: ThreadType,
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +defaultRolePermissions: ThreadRolePermissionsBlob,
};
type ValidateCandidateMembersOptions = { +requireRelationship?: boolean };
async function validateCandidateMembers(
  viewer: Viewer,
  candidates: CandidateMembers,
  params: ValidateCandidateMembersParams,
  options?: ValidateCandidateMembersOptions,
): Promise<CandidateMembers> {
  const requireRelationship = options?.requireRelationship ?? true;

  const allCandidatesSet = new Set();
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
    Map<string, 'member' | 'non-member' | 'no-containing-thread'>,
  > = (async () => {
    const results = new Map();
    if (allCandidates.length === 0) {
      return results;
    }
    if (!params.containingThreadID) {
      for (const userID of allCandidates) {
        results.set(userID, 'no-containing-thread');
      }
      return results;
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

  const [
    fetchedMembers,
    parentPermissions,
    memberOfContainingThread,
  ] = await Promise.all([
    fetchMembersPromise,
    parentPermissionsPromise,
    memberOfContainingThreadPromise,
  ]);

  const ignoreMembers = new Set();
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
    if (memberOfContainingThread.get(memberID) === 'non-member') {
      ignoreMembers.add(memberID);
      continue;
    }
    const isParentThreadGenesis = params.parentThreadID === genesis.id;
    if (
      (memberOfContainingThread.get(memberID) === 'no-containing-thread' ||
        isParentThreadGenesis) &&
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

  const result = {};
  for (const key in candidates) {
    const candidateGroup = candidates[key];
    if (!candidateGroup) {
      result[key] = candidates[key];
      continue;
    }
    result[key] = [];
    for (const candidate of candidateGroup) {
      if (!ignoreMembers.has(candidate)) {
        result[key].push(candidate);
      }
    }
  }
  return result;
}

export {
  fetchThreadPermissionsBlob,
  checkThreadPermission,
  viewerIsMember,
  checkThreads,
  getValidThreads,
  checkThread,
  checkIfThreadIsBlocked,
  validateCandidateMembers,
};
