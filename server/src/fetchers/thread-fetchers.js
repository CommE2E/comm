// @flow

import type { RawThreadInfo, ServerThreadInfo } from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import { getAllThreadPermissions } from 'lib/permissions/thread-permissions';
import { rawThreadInfoFromServerThreadInfo } from 'lib/shared/thread-utils';

import { dbQuery, SQL, SQLStatement } from '../database/database';

type FetchServerThreadInfosResult = {|
  threadInfos: { [id: string]: ServerThreadInfo },
|};

async function fetchServerThreadInfos(
  condition?: SQLStatement,
): Promise<FetchServerThreadInfosResult> {
  const whereClause = condition ? SQL`WHERE `.append(condition) : '';

  const query = SQL`
    SELECT t.id, t.name, t.parent_thread_id, t.color, t.description,
      t.type, t.creation_time, t.default_role, r.id AS role,
      r.name AS role_name, r.permissions AS role_permissions, m.user,
      m.permissions, m.subscription, 
      m.last_read_message < m.last_message AS unread
    FROM threads t
    LEFT JOIN (
        SELECT thread, id, name, permissions
          FROM roles
        UNION SELECT id AS thread, 0 AS id, NULL AS name, NULL AS permissions
          FROM threads
      ) r ON r.thread = t.id
    LEFT JOIN memberships m ON m.role = r.id AND m.thread = t.id AND
      m.role >= 0
  `
    .append(whereClause)
    .append(SQL`ORDER BY m.user ASC`);
  const [result] = await dbQuery(query);

  const threadInfos = {};
  for (let row of result) {
    const threadID = row.id.toString();
    if (!threadInfos[threadID]) {
      threadInfos[threadID] = {
        id: threadID,
        type: row.type,
        visibilityRules: row.type,
        name: row.name ? row.name : '',
        description: row.description ? row.description : '',
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
      const allPermissions = getAllThreadPermissions(row.permissions, threadID);
      threadInfos[threadID].members.push({
        id: userID,
        permissions: allPermissions,
        role: row.role ? role : null,
        subscription: row.subscription,
        unread: row.role ? !!row.unread : null,
      });
    }
  }
  return { threadInfos };
}

export type FetchThreadInfosResult = {|
  threadInfos: { [id: string]: RawThreadInfo },
|};

async function fetchThreadInfos(
  viewer: Viewer,
  condition?: SQLStatement,
): Promise<FetchThreadInfosResult> {
  const serverResult = await fetchServerThreadInfos(condition);
  return rawThreadInfosFromServerThreadInfos(viewer, serverResult);
}

function rawThreadInfosFromServerThreadInfos(
  viewer: Viewer,
  serverResult: FetchServerThreadInfosResult,
): FetchThreadInfosResult {
  const viewerID = viewer.id;
  const threadInfos = {};
  for (let threadID in serverResult.threadInfos) {
    const serverThreadInfo = serverResult.threadInfos[threadID];
    const threadInfo = rawThreadInfoFromServerThreadInfo(
      serverThreadInfo,
      viewerID,
    );
    if (threadInfo) {
      threadInfos[threadID] = threadInfo;
    }
  }
  return { threadInfos };
}

async function verifyThreadIDs(
  threadIDs: $ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<string>> {
  if (threadIDs.length === 0) {
    return [];
  }

  const query = SQL`SELECT id FROM threads WHERE id IN (${threadIDs})`;
  const [result] = await dbQuery(query);

  const verified = [];
  for (let row of result) {
    verified.push(row.id.toString());
  }
  return verified;
}

async function verifyThreadID(threadID: string): Promise<boolean> {
  const result = await verifyThreadIDs([threadID]);
  return result.length !== 0;
}

export {
  fetchServerThreadInfos,
  fetchThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  verifyThreadIDs,
  verifyThreadID,
};
