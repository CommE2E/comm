// @flow

import type {
  ThreadPermission,
  ThreadPermissionsBlob,
} from 'lib/types/thread-types';
import { permissionLookup } from 'lib/permissions/thread-permissions';

import type { Viewer } from '../session/viewer';

import { dbQuery, SQL } from '../database/database';

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
  const query = SQL`
      SELECT thread, permissions, role
      FROM memberships
      WHERE thread IN (${threadIDs}) AND user = ${viewer.userID}
  `;
  const [result] = await dbQuery(query);

  return new Set(
    result
      .filter(row => isThreadValid(row.permissions, row.role, checks))
      .map(row => row.thread.toString()),
  );
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
};
