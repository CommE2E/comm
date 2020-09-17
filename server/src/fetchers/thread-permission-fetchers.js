// @flow

import type {
  ThreadPermission,
  ThreadPermissionsBlob,
} from 'lib/types/thread-types';
import { permissionLookup } from 'lib/permissions/thread-permissions';

import type { Viewer } from '../session/viewer';

import { dbQuery, SQL } from '../database';

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

async function checkThreadPermission(
  viewer: Viewer,
  threadID: string,
  permission: ThreadPermission,
): Promise<boolean> {
  const permissionsBlob = await fetchThreadPermissionsBlob(viewer, threadID);
  return permissionLookup(permissionsBlob, permission);
}

async function checkThreadPermissions(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
  permission: ThreadPermission,
): Promise<{ [threadID: string]: boolean }> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT thread, permissions
    FROM memberships
    WHERE thread IN (${threadIDs}) AND user = ${viewerID}
  `;
  const [result] = await dbQuery(query);

  const permissionsBlobs = new Map();
  for (let row of result) {
    const threadID = row.thread.toString();
    permissionsBlobs.set(threadID, row.permissions);
  }

  const permissionByThread = {};
  for (let threadID of threadIDs) {
    const permissionsBlob = permissionsBlobs.get(threadID);
    permissionByThread[threadID] = permissionLookup(
      permissionsBlob,
      permission,
    );
  }
  return permissionByThread;
}

async function viewerIsMember(
  viewer: Viewer,
  threadID: string,
): Promise<boolean> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT role
    FROM memberships
    WHERE user = ${viewerID} AND thread = ${threadID}
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return false;
  }
  const row = result[0];
  return row.role > 0;
}

export {
  fetchThreadPermissionsBlob,
  checkThreadPermission,
  checkThreadPermissions,
  viewerIsMember,
};
