// @flow

import type {
  RawThreadInfo,
  ServerThreadInfo,
  ThreadPermission,
} from 'lib/types/thread-types';
import type { AccountUserInfo } from 'lib/types/user-types';
import type { PermissionsInfo } from 'lib/permissions/thread-permissions';
import type { Viewer } from '../session/viewer';

import {
  assertVisibilityRules,
  threadPermissions,
} from 'lib/types/thread-types';
import {
  getAllThreadPermissions,
  permissionHelper,
} from 'lib/permissions/thread-permissions';
import { rawThreadInfoFromServerThreadInfo } from 'lib/shared/thread-utils';

import { dbQuery, SQL, SQLStatement } from '../database';

type FetchServerThreadInfosResult = {|
  threadInfos: {[id: string]: ServerThreadInfo},
  userInfos: {[id: string]: AccountUserInfo},
|};

async function fetchServerThreadInfos(
  viewer: Viewer,
  condition?: SQLStatement,
): Promise<FetchServerThreadInfosResult> {
  const whereClause = condition ? SQL`WHERE `.append(condition) : "";

  const query = SQL`
    SELECT t.id, t.name, t.parent_thread_id, t.color, t.description,
      t.visibility_rules, t.creation_time, t.default_role, r.id AS role,
      r.name AS role_name, r.permissions AS role_permissions, m.user,
      m.permissions, m.subscription, m.unread, u.username
    FROM threads t
    LEFT JOIN (
        SELECT thread, id, name, permissions
          FROM roles
        UNION SELECT id AS thread, 0 AS id, NULL AS name, NULL AS permissions
          FROM threads
      ) r ON r.thread = t.id
    LEFT JOIN memberships m ON m.role = r.id AND m.thread = t.id
    LEFT JOIN users u ON u.id = m.user
  `.append(whereClause).append(SQL`ORDER BY m.user ASC`);
  const [ result ] = await dbQuery(query);

  const threadInfos = {};
  const userInfos = {};
  for (let row of result) {
    const threadID = row.id.toString();
    if (!threadInfos[threadID]) {
      threadInfos[threadID] = {
        id: threadID,
        name: row.name ? row.name : "",
        description: row.description ? row.description : "",
        visibilityRules: row.visibility_rules,
        color: row.color,
        creationTime: row.creation_time,
        parentThreadID: row.parent_thread_id
          ? row.parent_thread_id.toString()
          : null,
        members: [],
        roles: {},
      };
    }
    const role = row.role.toString();
    if (row.role && !threadInfos[threadID].roles[role]) {
      threadInfos[threadID].roles[role] = {
        id: role,
        name: row.role_name,
        permissions: JSON.parse(row.role_permissions),
        isDefault: role === row.default_role.toString(),
      };
    }
    if (row.user) {
      const userID = row.user.toString();
      const allPermissions = getAllThreadPermissions(
        {
          permissions: row.permissions,
          visibilityRules: assertVisibilityRules(row.visibility_rules),
        },
        threadID,
      );
      const member = {
        id: userID,
        permissions: allPermissions,
        role: row.role ? role : null,
        subscription: row.subscription,
        unread: row.role ? !!row.unread : null,
      };
      // This is a hack, similar to what we have in ThreadSettingsMember.
      // Basically we only want to return users that are either a member of this
      // thread, or are a "parent admin". We approximate "parent admin" by
      // looking for the PERMISSION_CHANGE_ROLE permission.
      if (
        userID === viewer.id ||
        row.role ||
        allPermissions[threadPermissions.CHANGE_ROLE].value
      ) {
        threadInfos[threadID].members.push(member);
        if (row.username) {
          userInfos[userID] = {
            id: userID,
            username: row.username,
          };
        }
      }
    }
  }
  return { threadInfos, userInfos };
}

type FetchThreadInfosResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: AccountUserInfo},
|};

async function fetchThreadInfos(
  viewer: Viewer,
  condition?: SQLStatement,
): Promise<FetchThreadInfosResult> {
  const serverResult = await fetchServerThreadInfos(viewer, condition);
  const viewerID = viewer.id;
  const threadInfos = {};
  const userInfos = {};
  for (let threadID in serverResult.threadInfos) {
    const serverThreadInfo = serverResult.threadInfos[threadID];
    const threadInfo = rawThreadInfoFromServerThreadInfo(
      serverThreadInfo,
      viewerID,
    );
    if (threadInfo) {
      threadInfos[threadID] = threadInfo;
      for (let member of threadInfo.members) {
        const userInfo = serverResult.userInfos[member.id];
        if (userInfo) {
          userInfos[member.id] = userInfo;
        }
      }
    }
  }
  return { threadInfos, userInfos };
}

async function verifyThreadIDs(
  threadIDs: $ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<string>> {
  if (threadIDs.length === 0) {
    return [];
  }

  const query = SQL`SELECT id FROM threads WHERE id IN (${threadIDs})`;
  const [ result ] = await dbQuery(query);

  const verified = [];
  for (let row of result) {
    verified.push(row.id.toString());
  }
  return verified;
}

async function verifyThreadID(threadID: string): Promise<bool> {
  const result = await verifyThreadIDs([threadID]);
  return result.length !== 0;
}

async function fetchThreadPermissionsInfo(
  viewer: Viewer,
  threadID: string,
): Promise<?PermissionsInfo> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT t.visibility_rules, m.permissions
    FROM threads t
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = ${viewerID}
    WHERE t.id = ${threadID}
  `;
  const [ result ] = await dbQuery(query);

  if (result.length === 0) {
    return null;
  }
  const row = result[0];
  return {
    permissions: row.permissions,
    visibilityRules: assertVisibilityRules(row.visibility_rules),
  };
}

async function checkThreadPermission(
  viewer: Viewer,
  threadID: string,
  permission: ThreadPermission,
): Promise<bool> {
  const permissionsInfo = await fetchThreadPermissionsInfo(viewer, threadID);
  return permissionHelper(permissionsInfo, permission);
}

async function viewerIsMember(
  viewer: Viewer,
  threadID: string,
): Promise<bool> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT role
    FROM memberships
    WHERE user = ${viewerID} AND thread = ${threadID}
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return false;
  }
  const row = result[0];
  return !!row.role;
}

export {
  fetchServerThreadInfos,
  fetchThreadInfos,
  verifyThreadIDs,
  verifyThreadID,
  fetchThreadPermissionsInfo,
  checkThreadPermission,
  viewerIsMember,
};
