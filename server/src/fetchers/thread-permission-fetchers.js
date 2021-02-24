// @flow

import { permissionLookup } from 'lib/permissions/thread-permissions';
import {
  threadFrozenDueToBlock,
  permissionsDisabledByBlock,
} from 'lib/shared/thread-utils';
import type {
  ThreadPermission,
  ThreadPermissionsBlob,
} from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';
import { fetchThreadInfos } from './thread-fetchers';
import { fetchKnownUserInfos } from './user-fetchers';

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
  return row.permissions;
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
  | {| +check: 'is_member' |}
  | {| +check: 'permission', +permission: ThreadPermission |};

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

  const query = SQL`
    SELECT thread, permissions, role
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

  return new Set(
    result
      .filter(
        (row) =>
          isThreadValid(row.permissions, row.role, checks) &&
          !disabledThreadIDs.has(row.thread.toString()),
      )
      .map((row) => row.thread.toString()),
  );
}

async function checkThreadsFrozen(
  viewer: Viewer,
  permissionsToCheck: $ReadOnlyArray<ThreadPermission>,
  threadIDs: $ReadOnlyArray<string>,
) {
  const threadIDsWithDisabledPermissions = new Set();

  const permissionMightBeDisabled = permissionsToCheck.some((permission) =>
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
) {
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

export {
  fetchThreadPermissionsBlob,
  checkThreadPermission,
  viewerIsMember,
  checkThreads,
  checkThread,
  checkIfThreadIsBlocked,
};
