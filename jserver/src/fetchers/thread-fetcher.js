// @flow

import type { Connection } from '../database';
import type { RawThreadInfo, ServerThreadInfo  } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';

import {
  assertVisibilityRules,
  threadPermissions,
} from 'lib/types/thread-types';
import { getAllThreadPermissions } from 'lib/permissions/thread-permissions';
import { rawThreadInfoFromServerThreadInfo } from 'lib/shared/thread-utils';

import { SQL, SQLStatement } from '../database';
import { currentViewer } from '../session/viewer';

type FetchServerThreadInfosResult = {|
  threadInfos: {[id: string]: ServerThreadInfo},
  userInfos: {[id: string]: UserInfo},
|};

async function fetchServerThreadInfos(
  conn: Connection,
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
  const [ result ] = await conn.query(query);

  const threadInfos = {};
  const userInfos = {};
  for (let row of result) {
    const threadID = row.id;
    if (!threadInfos[threadID]) {
      threadInfos[threadID] = {
        id: threadID,
        name: row.name,
        description: row.description,
        visibilityRules: row.visibility_rules,
        color: row.color,
        creationTime: row.creation_time,
        parentThreadID: row.parent_thread_id,
        members: [],
        roles: {},
      };
    }
    if (row.role && !threadInfos[threadID].roles[row.role]) {
      threadInfos[threadID].roles[row.role] = {
        id: row.role,
        name: row.role_name,
        permissions: row.role_permissions,
        isDefault: row.role === row.default_role,
      };
    }
    if (row.user) {
      const userID = row.user;
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
        role: row.role ? row.role : null,
        subscription: row.subscription,
        unread: row.role ? row.unread : null,
      };
      // This is a hack, similar to what we have in ThreadSettingsUser.
      // Basically we only want to return users that are either a member of this
      // thread, or are a "parent admin". We approximate "parent admin" by
      // looking for the PERMISSION_CHANGE_ROLE permission.
      if (row.role || allPermissions[threadPermissions.CHANGE_ROLE].value) {
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
  userInfos: {[id: string]: UserInfo},
|};

async function fetchThreadInfos(
  conn: Connection,
  condition?: SQLStatement,
): Promise<FetchThreadInfosResult> {
  const serverResult = await fetchServerThreadInfos(conn, condition);
  const viewerID = currentViewer().id;
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
        userInfos[member.id] = serverResult.userInfos[member.id];
      }
    }
  }
  return { threadInfos, userInfos };
}

async function verifyThreadIDs(
  conn: Connection,
  threadIDs: $ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<string>> {
  if (threadIDs.length === 0) {
    return [];
  }

  const query = SQL`SELECT id FROM threads WHERE id IN (${threadIDs})`;
  const [ result ] = await conn.query(query);

  const verified = [];
  for (let row of result) {
    verified.push(row.id.toString());
  }
  return verified;
}

export {
  fetchServerThreadInfos,
  fetchThreadInfos,
  verifyThreadIDs,
};
