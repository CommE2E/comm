// @flow

import { getAllThreadPermissions } from 'lib/permissions/thread-permissions.js';
import {
  rawThreadInfoFromServerThreadInfo,
  getContainingThreadID,
  getCommunity,
} from 'lib/shared/thread-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types.js';
import {
  threadTypes,
  type ThreadType,
  type RawThreadInfo,
  type ServerThreadInfo,
} from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import type { Viewer } from '../session/viewer.js';

type FetchServerThreadInfosResult = {
  +threadInfos: { +[id: string]: ServerThreadInfo },
};

async function fetchServerThreadInfos(
  condition?: SQLStatementType,
): Promise<FetchServerThreadInfosResult> {
  const whereClause = condition ? SQL`WHERE `.append(condition) : '';

  const query = SQL`
    SELECT t.id, t.name, t.parent_thread_id, t.containing_thread_id,
      t.community, t.depth, t.color, t.description, t.type, t.creation_time,
      t.default_role, t.source_message, t.replies_count, t.pinned_count, 
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
        containingThreadID: row.containing_thread_id
          ? row.containing_thread_id.toString()
          : null,
        depth: row.depth,
        community: row.community ? row.community.toString() : null,
        members: [],
        roles: {},
        repliesCount: row.replies_count,
        pinnedCount: row.pinned_count,
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
      const allPermissions = getAllThreadPermissions(
        JSON.parse(row.permissions),
        threadID,
      );
      threadInfos[threadID].members.push({
        id: userID,
        permissions: allPermissions,
        role: row.role ? role : null,
        subscription: JSON.parse(row.subscription),
        unread: row.role ? !!row.unread : null,
        isSender: !!row.sender,
      });
    }
  }
  return { threadInfos };
}

export type FetchThreadInfosResult = {
  +threadInfos: { +[id: string]: RawThreadInfo },
};

async function fetchThreadInfos(
  viewer: Viewer,
  condition?: SQLStatementType,
): Promise<FetchThreadInfosResult> {
  const serverResult = await fetchServerThreadInfos(condition);
  return rawThreadInfosFromServerThreadInfos(viewer, serverResult);
}

const shimCommunityRoot = {
  [threadTypes.COMMUNITY_ROOT]: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
  [threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT]:
    threadTypes.COMMUNITY_SECRET_SUBTHREAD,
  [threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD]:
    threadTypes.COMMUNITY_OPEN_SUBTHREAD,
  [threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD]:
    threadTypes.COMMUNITY_SECRET_SUBTHREAD,
  [threadTypes.GENESIS]: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
};

function rawThreadInfosFromServerThreadInfos(
  viewer: Viewer,
  serverResult: FetchServerThreadInfosResult,
): FetchThreadInfosResult {
  const viewerID = viewer.id;
  const hasCodeVersionBelow70 = !hasMinCodeVersion(viewer.platformDetails, 70);
  const hasCodeVersionBelow87 = !hasMinCodeVersion(viewer.platformDetails, 87);
  const hasCodeVersionBelow102 = !hasMinCodeVersion(
    viewer.platformDetails,
    102,
  );
  const hasCodeVersionBelow104 = !hasMinCodeVersion(
    viewer.platformDetails,
    104,
  );
  // TODO - CHANGE BEFORE LANDING
  const hasCodeVersionBelow202 = !hasMinCodeVersion(
    viewer.platformDetails,
    202,
  );
  const threadInfos = {};
  for (const threadID in serverResult.threadInfos) {
    const serverThreadInfo = serverResult.threadInfos[threadID];
    const threadInfo = rawThreadInfoFromServerThreadInfo(
      serverThreadInfo,
      viewerID,
      {
        includeVisibilityRules: hasCodeVersionBelow70,
        filterMemberList: hasCodeVersionBelow70,
        shimThreadTypes: hasCodeVersionBelow87 ? shimCommunityRoot : null,
        hideThreadStructure: hasCodeVersionBelow102,
        filterDetailedThreadEditPermissions: hasCodeVersionBelow104,
        excludePinnedCount: hasCodeVersionBelow202,
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

type ThreadAncestry = {
  +containingThreadID: ?string,
  +community: ?string,
  +depth: number,
};
async function determineThreadAncestry(
  parentThreadID: ?string,
  threadType: ThreadType,
): Promise<ThreadAncestry> {
  if (!parentThreadID) {
    return { containingThreadID: null, community: null, depth: 0 };
  }
  const parentThreadInfos = await fetchServerThreadInfos(
    SQL`t.id = ${parentThreadID}`,
  );
  const parentThreadInfo = parentThreadInfos.threadInfos[parentThreadID];
  if (!parentThreadInfo) {
    throw new ServerError('invalid_parameters');
  }
  const containingThreadID = getContainingThreadID(
    parentThreadInfo,
    threadType,
  );
  const community = getCommunity(parentThreadInfo);
  const depth = parentThreadInfo.depth + 1;
  return { containingThreadID, community, depth };
}

function personalThreadQuery(
  firstMemberID: string,
  secondMemberID: string,
): SQLStatementType {
  return SQL`
    SELECT t.id 
    FROM threads t
    INNER JOIN memberships m1 
      ON m1.thread = t.id AND m1.user = ${firstMemberID}
    INNER JOIN memberships m2
      ON m2.thread = t.id AND m2.user = ${secondMemberID}
    WHERE t.type = ${threadTypes.PERSONAL}
      AND m1.role > 0
      AND m2.role > 0
  `;
}

async function fetchPersonalThreadID(
  viewerID: string,
  otherMemberID: string,
): Promise<?string> {
  const query = personalThreadQuery(viewerID, otherMemberID);
  const [threads] = await dbQuery(query);
  return threads[0]?.id.toString();
}

async function serverThreadInfoFromMessageInfo(
  message: RawMessageInfo | MessageInfo,
): Promise<?ServerThreadInfo> {
  const threadID = message.threadID;
  const threads = await fetchServerThreadInfos(SQL`t.id = ${threadID}`);
  return threads.threadInfos[threadID];
}

export {
  fetchServerThreadInfos,
  fetchThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  verifyThreadIDs,
  verifyThreadID,
  determineThreadAncestry,
  personalThreadQuery,
  fetchPersonalThreadID,
  serverThreadInfoFromMessageInfo,
};
