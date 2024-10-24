// @flow

import invariant from 'invariant';

import genesis from 'lib/facts/genesis.js';
import { specialRoles } from 'lib/permissions/special-roles.js';
import { getAllThreadPermissions } from 'lib/permissions/thread-permissions.js';
import {
  rawThreadInfoFromServerThreadInfo,
  getContainingThreadID,
  getCommunity,
} from 'lib/shared/thread-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { AvatarDBContent, ClientAvatar } from 'lib/types/avatar-types.js';
import type { RawMessageInfo, MessageInfo } from 'lib/types/message-types.js';
import type { ThinRawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes, type ThreadType } from 'lib/types/thread-types-enum.js';
import {
  type ServerThreadInfo,
  type ServerLegacyRoleInfo,
  type LegacyThinRawThreadInfo,
} from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { getUploadURL, makeUploadURI } from './upload-fetchers.js';
import { dbQuery, SQL, mergeAndConditions } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import type { Viewer } from '../session/viewer.js';

type FetchThreadInfosFilter = Partial<{
  +accessibleToUserID: string,
  +threadID: string,
  +threadIDs: $ReadOnlySet<string>,
  +parentThreadID: string,
  +sourceMessageID: string,
}>;
function constructWhereClause(
  filter: FetchThreadInfosFilter,
): SQLStatementType {
  const fromTable = filter.accessibleToUserID ? 'memberships' : 'threads';

  const conditions = [];

  if (filter.accessibleToUserID) {
    conditions.push(
      SQL`mm.user = ${filter.accessibleToUserID} AND mm.role > -1`,
    );
  }

  if (filter.threadID && fromTable === 'memberships') {
    conditions.push(SQL`mm.thread = ${filter.threadID}`);
  } else if (filter.threadID) {
    conditions.push(SQL`t.id = ${filter.threadID}`);
  }

  if (filter.threadIDs && fromTable === 'memberships') {
    conditions.push(SQL`mm.thread IN (${[...filter.threadIDs]})`);
  } else if (filter.threadIDs) {
    conditions.push(SQL`t.id IN (${[...filter.threadIDs]})`);
  }

  if (filter.parentThreadID) {
    conditions.push(SQL`t.parent_thread_id = ${filter.parentThreadID}`);
  }

  if (filter.sourceMessageID) {
    conditions.push(SQL`t.source_message = ${filter.sourceMessageID}`);
  }

  if (conditions.length === 0) {
    return SQL``;
  }

  const clause = mergeAndConditions(conditions);
  return SQL`WHERE `.append(clause);
}

type FetchServerThreadInfosResult = {
  +threadInfos: { +[id: string]: ServerThreadInfo },
};

async function fetchServerThreadInfos(
  filter?: FetchThreadInfosFilter,
): Promise<FetchServerThreadInfosResult> {
  if (filter?.threadIDs?.size === 0) {
    return { threadInfos: {} };
  }

  let primaryFetchClause;
  if (filter?.accessibleToUserID) {
    primaryFetchClause = SQL`
      FROM memberships mm
      LEFT JOIN threads t ON t.id = mm.thread
    `;
  } else {
    primaryFetchClause = SQL`
      FROM threads t
    `;
  }

  const whereClause = filter ? constructWhereClause(filter) : '';

  const rolesQuery = SQL`
    SELECT t.id, r.id AS role, r.name, r.permissions, r.special_role,
      r.special_role = ${specialRoles.DEFAULT_ROLE} AS is_default
  `
    .append(primaryFetchClause)
    .append(
      SQL`
      LEFT JOIN roles r ON r.thread = t.id
    `,
    )
    .append(whereClause);

  const threadsQuery = SQL`
    SELECT t.id, t.name, t.parent_thread_id, t.containing_thread_id,
      t.community, t.depth, t.color, t.description, t.type, t.creation_time,
      t.source_message, t.replies_count, t.avatar, t.pinned_count, m.user,
      m.role, m.permissions, m.subscription,
      m.last_read_message < m.last_message AS unread, m.sender,
      up.id AS upload_id, up.secret AS upload_secret, up.extra AS upload_extra
  `
    .append(primaryFetchClause)
    .append(
      SQL`
      LEFT JOIN memberships m ON m.thread = t.id AND m.role >= 0
      LEFT JOIN uploads up ON up.container = t.id
    `,
    )
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
        if (
          avatar &&
          avatar.type !== 'image' &&
          avatar.type !== 'encrypted_image'
        ) {
          clientAvatar = avatar;
        } else if (
          avatar &&
          (avatar.type === 'image' || avatar.type === 'encrypted_image') &&
          threadsRow.upload_id &&
          threadsRow.upload_secret
        ) {
          const uploadID = threadsRow.upload_id.toString();
          invariant(
            uploadID === avatar.uploadID,
            `uploadID of upload should match uploadID of image avatar`,
          );
          if (avatar.type === 'encrypted_image' && threadsRow.upload_extra) {
            const uploadExtra = JSON.parse(threadsRow.upload_extra);
            clientAvatar = {
              type: 'encrypted_image',
              blobURI: makeUploadURI(
                uploadExtra.blobHash,
                uploadID,
                threadsRow.upload_secret,
              ),
              encryptionKey: uploadExtra.encryptionKey,
              thumbHash: uploadExtra.thumbHash,
            };
          } else {
            clientAvatar = {
              type: 'image',
              uri: getUploadURL(uploadID, threadsRow.upload_secret),
            };
          }
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
      const roleInfo: ServerLegacyRoleInfo = {
        id: role,
        name: rolesRow.name,
        permissions: JSON.parse(rolesRow.permissions),
        isDefault: Boolean(rolesRow.is_default),
        specialRole: rolesRow.special_role,
      };
      threadInfos[threadID].roles[role] = roleInfo;
    }
  }

  return { threadInfos };
}

export type FetchThreadInfosResult = {
  +threadInfos: {
    +[id: string]: LegacyThinRawThreadInfo | ThinRawThreadInfo,
  },
};

async function fetchThreadInfos(
  viewer: Viewer,
  inputFilter?: FetchThreadInfosFilter,
): Promise<FetchThreadInfosResult> {
  const filter = {
    accessibleToUserID: viewer.id,
    ...inputFilter,
  };
  const serverResult = await fetchServerThreadInfos(filter);
  return rawThreadInfosFromServerThreadInfos(viewer, serverResult);
}

function rawThreadInfosFromServerThreadInfos(
  viewer: Viewer,
  serverResult: FetchServerThreadInfosResult,
): FetchThreadInfosResult {
  const viewerID = viewer.id;
  const codeVersionBelow209 = !hasMinCodeVersion(viewer.platformDetails, {
    native: 209,
  });
  const codeVersionBelow213 = !hasMinCodeVersion(viewer.platformDetails, {
    native: 213,
  });
  const codeVersionBelow221 = !hasMinCodeVersion(viewer.platformDetails, {
    native: 221,
  });
  const codeVersionBelow283 = !hasMinCodeVersion(viewer.platformDetails, {
    native: 285,
  });
  const minimallyEncodedPermissionsSupported = hasMinCodeVersion(
    viewer.platformDetails,
    { native: 301, web: 56 },
  );
  const specialRoleFieldSupported = hasMinCodeVersion(viewer.platformDetails, {
    native: 336,
    web: 79,
  });
  const addingUsersToCommunityRootSupported = !hasMinCodeVersion(
    viewer.platformDetails,
    {
      native: 355,
      web: 88,
    },
  );
  const manageFarcasterChannelTagsPermissionUnsupported = !hasMinCodeVersion(
    viewer.platformDetails,
    {
      native: 355,
      web: 88,
    },
  );
  const stripMemberPermissions = hasMinCodeVersion(viewer.platformDetails, {
    native: 379,
    web: 130,
  });
  const canDisplayFarcasterThreadAvatars = hasMinCodeVersion(
    viewer.platformDetails,
    {
      native: 429,
      web: 136,
    },
  );

  const threadInfos: {
    [string]: LegacyThinRawThreadInfo | ThinRawThreadInfo,
  } = {};
  for (const threadID in serverResult.threadInfos) {
    const serverThreadInfo = serverResult.threadInfos[threadID];
    const threadInfo = rawThreadInfoFromServerThreadInfo(
      serverThreadInfo,
      viewerID,
      {
        filterThreadEditAvatarPermission: codeVersionBelow213,
        excludePinInfo: codeVersionBelow209,
        filterManageInviteLinksPermission: codeVersionBelow221,
        filterVoicedInAnnouncementChannelsPermission: codeVersionBelow283,
        minimallyEncodePermissions: minimallyEncodedPermissionsSupported,
        includeSpecialRoleFieldInRoles: specialRoleFieldSupported,
        allowAddingUsersToCommunityRoot: addingUsersToCommunityRootSupported,
        filterManageFarcasterChannelTagsPermission:
          manageFarcasterChannelTagsPermissionUnsupported,
        stripMemberPermissions: stripMemberPermissions,
        canDisplayFarcasterThreadAvatars,
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
  const parentThreadInfos = await fetchServerThreadInfos({
    threadID: parentThreadID,
  });
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

function determineThreadAncestryForPossibleMemberResolution(
  parentThreadID: ?string,
  containingThreadID: ?string,
): ?string {
  let resolvedContainingThreadID = containingThreadID;
  if (resolvedContainingThreadID === genesis().id) {
    resolvedContainingThreadID =
      parentThreadID === genesis().id ? null : parentThreadID;
  }
  return resolvedContainingThreadID;
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
    WHERE t.type = ${threadTypes.GENESIS_PERSONAL}
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
  const threads = await fetchServerThreadInfos({ threadID });
  return threads.threadInfos[threadID];
}

async function fetchContainedThreadIDs(
  parentThreadID: string,
): Promise<Array<string>> {
  const query = SQL`
    WITH RECURSIVE thread_tree AS (
      SELECT id, containing_thread_id
      FROM threads
      WHERE id = ${parentThreadID}
      UNION ALL
      SELECT t.id, t.containing_thread_id
      FROM threads t
      JOIN thread_tree tt ON t.containing_thread_id = tt.id
    )
    SELECT id FROM thread_tree
  `;
  const [result] = await dbQuery(query);
  return result.map(row => row.id.toString());
}

export {
  fetchServerThreadInfos,
  fetchThreadInfos,
  rawThreadInfosFromServerThreadInfos,
  verifyThreadIDs,
  verifyThreadID,
  determineThreadAncestry,
  determineThreadAncestryForPossibleMemberResolution,
  personalThreadQuery,
  fetchPersonalThreadID,
  serverThreadInfoFromMessageInfo,
  fetchContainedThreadIDs,
};
