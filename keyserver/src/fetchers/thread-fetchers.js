// @flow

import invariant from 'invariant';

import { getAllThreadPermissions } from 'lib/permissions/thread-permissions.js';
import {
  rawThreadInfoFromServerThreadInfo,
  getContainingThreadID,
  getCommunity,
} from 'lib/shared/thread-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { AvatarDBContent, ClientAvatar } from 'lib/types/avatar-types.js';
import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types.js';
import {
  threadTypes,
  type ThreadType,
  type RawThreadInfo,
  type ServerThreadInfo,
} from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { getUploadURL } from './upload-fetchers.js';
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

  const rolesQuery = SQL`
    SELECT t.id, t.default_role, r.id AS role, r.name, r.permissions
    FROM threads t
    LEFT JOIN roles r ON r.thread = t.id
  `.append(whereClause);

  const threadsQuery = SQL`
  SELECT t.id, t.name, t.parent_thread_id, t.containing_thread_id,
    t.community, t.depth, t.color, t.description, t.type, t.creation_time,
    t.source_message, t.replies_count, t.avatar, t.pinned_count, m.user, 
    m.role, m.permissions, m.subscription, 
    m.last_read_message < m.last_message AS unread, m.sender,
    up.id AS upload_id, up.secret AS upload_secret
  FROM threads t
  LEFT JOIN memberships m ON m.thread = t.id AND m.role >= 0
  LEFT JOIN uploads up ON up.container = t.id
  `
    .append(whereClause)
    .append(SQL` ORDER BY m.user ASC`);
  const [[threadsResult], [rolesResult]] = await Promise.all([
    dbQuery(threadsQuery),
    dbQuery(rolesQuery),
  ]);

  const threadInfos = {};
  for (const threadsRow of threadsResult) {
    const threadID = threadsRow.id.toString();
    if (!threadInfos[threadID]) {
      threadInfos[threadID] = {
        id: threadID,
        type: threadsRow.type,
        name: threadsRow.name ? threadsRow.name : '',
        description: threadsRow.description ? threadsRow.description : '',
        color: threadsRow.color,
        creationTime: threadsRow.creation_time,
        parentThreadID: threadsRow.parent_thread_id
          ? threadsRow.parent_thread_id.toString()
          : null,
        containingThreadID: threadsRow.containing_thread_id
          ? threadsRow.containing_thread_id.toString()
          : null,
        depth: threadsRow.depth,
        community: threadsRow.community
          ? threadsRow.community.toString()
          : null,
        members: [],
        roles: {},
        repliesCount: threadsRow.replies_count,
        pinnedCount: threadsRow.pinned_count,
      };
      if (threadsRow.avatar) {
        const avatar: AvatarDBContent = JSON.parse(threadsRow.avatar);
        let clientAvatar: ?ClientAvatar;
        if (avatar && avatar.type !== 'image') {
          clientAvatar = avatar;
        } else if (
          avatar &&
          avatar.type === 'image' &&
          threadsRow.upload_id &&
          threadsRow.upload_secret
        ) {
          const uploadID = threadsRow.upload_id.toString();
          invariant(
            uploadID === avatar.uploadID,
            `uploadID of upload should match uploadID of image avatar`,
          );
          clientAvatar = {
            type: 'image',
            uri: getUploadURL(uploadID, threadsRow.upload_secret),
          };
        }

        threadInfos[threadID] = {
          ...threadInfos[threadID],
          avatar: clientAvatar,
        };
      }
    }
    const sourceMessageID = threadsRow.source_message?.toString();
    if (sourceMessageID) {
      threadInfos[threadID].sourceMessageID = sourceMessageID;
    }
    if (threadsRow.user) {
      const userID = threadsRow.user.toString();
      const allPermissions = getAllThreadPermissions(
        JSON.parse(threadsRow.permissions),
        threadID,
      );
      threadInfos[threadID].members.push({
        id: userID,
        permissions: allPermissions,
        role: threadsRow.role ? threadsRow.role.toString() : null,
        subscription: JSON.parse(threadsRow.subscription),
        unread: threadsRow.role ? !!threadsRow.unread : null,
        isSender: !!threadsRow.sender,
      });
    }
  }

  for (const rolesRow of rolesResult) {
    const threadID = rolesRow.id.toString();
    if (!rolesRow.role) {
      continue;
    }
    const role = rolesRow.role.toString();
    if (!threadInfos[threadID].roles[role]) {
      threadInfos[threadID].roles[role] = {
        id: role,
        name: rolesRow.name,
        permissions: JSON.parse(rolesRow.permissions),
        isDefault: role === rolesRow.default_role.toString(),
      };
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

  // TODO (atul): Replace with `hasMinCodeVersion` check once we have a
  //              native release with thread avatar editing enabled.
  const filterThreadEditAvatarPermission = false;

  const hasCodeVersionBelow209 = !hasMinCodeVersion(
    viewer.platformDetails,
    209,
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
        filterThreadEditAvatarPermission,
        excludePinInfo: hasCodeVersionBelow209,
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
