// @flow

import { getAllThreadPermissions } from 'lib/permissions/thread-permissions';
import { rawThreadInfoFromServerThreadInfo } from 'lib/shared/thread-utils';
import { hasMinCodeVersion } from 'lib/shared/version-utils';
import {
  threadTypes,
  type RawThreadInfo,
  type ServerThreadInfo,
} from 'lib/types/thread-types';

import { dbQuery, SQL, SQLStatement } from '../database/database';
import type { Viewer } from '../session/viewer';

type FetchServerThreadInfosResult = {|
  threadInfos: { [id: string]: ServerThreadInfo },
|};

async function fetchServerThreadInfos(
  condition?: SQLStatement,
): Promise<FetchServerThreadInfosResult> {
  const whereClause = condition ? SQL`WHERE `.append(condition) : '';

  const query = SQL`
    SELECT t.id, t.name, t.parent_thread_id, t.color, t.description,
      t.type, t.creation_time, t.default_role, t.source_message, t.replies_count,
      r.id AS role, r.name AS role_name, r.permissions AS role_permissions,
      m.user, m.permissions, m.subscription,
      m.last_read_message < m.last_message AS unread, m.sender
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
    .append(SQL` ORDER BY m.user ASC`);
  const [result] = await dbQuery(query);

  const threadInfos = {};
  for (const row of result) {
    const threadID = row.id.toString();
    if (!threadInfos[threadID]) {
      threadInfos[threadID] = {
        id: threadID,
        type: row.type,
        name: row.name ? row.name : '',
        description: row.description ? row.description : '',
        color: row.color,
        creationTime: row.creation_time,
        parentThreadID: row.parent_thread_id
          ? row.parent_thread_id.toString()
          : null,
        members: [],
        roles: {},
        repliesCount: row.replies_count,
      };
    }
    const sourceMessageID = row.source_message?.toString();
    if (sourceMessageID) {
      threadInfos[threadID].sourceMessageID = sourceMessageID;
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
        isSender: !!row.sender,
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

const shimCommunityRoot = {
  [threadTypes.COMMUNITY_ROOT]: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
};

function rawThreadInfosFromServerThreadInfos(
  viewer: Viewer,
  serverResult: FetchServerThreadInfosResult,
): FetchThreadInfosResult {
  const viewerID = viewer.id;
  const hasCodeVersionBelow70 = !hasMinCodeVersion(viewer.platformDetails, 70);
  const hasCodeVersionBelow85 = !hasMinCodeVersion(viewer.platformDetails, 85);
  const threadInfos = {};
  for (const threadID in serverResult.threadInfos) {
    const serverThreadInfo = serverResult.threadInfos[threadID];
    const threadInfo = rawThreadInfoFromServerThreadInfo(
      serverThreadInfo,
      viewerID,
      {
        includeVisibilityRules: hasCodeVersionBelow70,
        filterMemberList: hasCodeVersionBelow70,
        shimThreadTypes: hasCodeVersionBelow85 ? shimCommunityRoot : null,
      },
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
  for (const row of result) {
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
